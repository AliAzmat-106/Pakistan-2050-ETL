import os
import sqlite3
import requests
import pandas as pd
from pydantic import BaseModel, field_validator, model_validator, ValidationError

COUNTRIES = {"PAK": "Pakistan", "IND": "India", "BGD": "Bangladesh",
             "CHN": "China", "USA": "United States", "WLD": "World"}
INDICATORS = {
    "NY.GDP.MKTP.CD": "gdp_nominal",
    "NY.GDP.MKTP.PP.CD": "gdp_ppp",
    "NY.GDP.MKTP.KD.ZG": "gdp_growth",
    "SP.POP.TOTL": "population",
    "SP.POP.GROW": "population_growth",
    "NY.GDP.PCAP.CD": "gdp_per_capita",
}
LEVELS = {"gdp_nominal", "gdp_ppp", "population", "gdp_per_capita"}
START, END = 2000, 2025


# ---------- EXTRACT ----------
def extract():
    rows = []
    codes = ";".join(COUNTRIES)
    for code, name in INDICATORS.items():
        url = f"https://api.worldbank.org/v2/country/{codes}/indicator/{code}"
        r = requests.get(url, params={"format": "json", "per_page": 2000,
                                      "date": f"{START}:{END}"}, timeout=30)
        r.raise_for_status()
        payload = r.json()
        if len(payload) < 2 or payload[1] is None:
            print(f"No data for {code}")
            continue
        for item in payload[1]:
            rows.append({
                "country_code": item["countryiso3code"],
                "country": item["country"]["value"],
                "indicator": name,
                "year": item["date"],
                "value": item["value"],
            })
    print(f"Extracted: {len(rows)} records")
    return rows


# ---------- VALIDATE (Pydantic) ----------
class Record(BaseModel):
    country_code: str
    country: str
    indicator: str
    year: int
    value: float | None = None

    @field_validator("country_code")
    @classmethod
    def check_code(cls, v):
        if v not in COUNTRIES:
            raise ValueError(f"unknown country code {v}")
        return v

    @field_validator("year")
    @classmethod
    def check_year(cls, v):
        if not START <= v <= END:
            raise ValueError(f"year {v} out of range")
        return v

    @model_validator(mode="after")
    def check_value(self):
        if self.value is not None and self.indicator in LEVELS and self.value <= 0:
            raise ValueError("level indicators must be positive")
        return self


def validate(rows):
    valid, rejected = [], []
    for row in rows:
        try:
            valid.append(Record(**row).model_dump())
        except ValidationError as e:
            rejected.append({**row, "error": str(e)})
    print(f"Valid: {len(valid)} | Rejected: {len(rejected)}")
    if rejected:
        pd.DataFrame(rejected).to_csv("data/rejected_records.csv", index=False)
    return valid


# ---------- TRANSFORM (pandas) ----------
def transform(valid):
    df = pd.DataFrame(valid)
    df["country_code"] = df["country_code"].str.upper().str.strip()
    df = df.pivot_table(index=["country_code", "country", "year"],
                        columns="indicator", values="value").reset_index()
    df.columns.name = None
    df = df.sort_values(["country_code", "year"]).reset_index(drop=True)

    # latest year jahan Pakistan ka GDP available hai
    last = df[(df.country_code == "PAK") & df.gdp_nominal.notna()]["year"].max()
    df = df[df["year"] <= last]

    # missing values: sirf beech ke gaps interpolate karo, extrapolate nahi
    num = [c for c in df.columns if c not in ("country_code", "country", "year")]
    df[num] = df.groupby("country_code")[num].transform(
        lambda s: s.interpolate(limit_area="inside"))

    # derived columns
    df["gdp_nominal_yoy"] = df.groupby("country_code")["gdp_nominal"].pct_change() * 100
    df["gdp_per_capita_growth"] = df.groupby("country_code")["gdp_per_capita"].pct_change() * 100
    df["ppp_to_nominal_ratio"] = df["gdp_ppp"] / df["gdp_nominal"]
    print(f"Clean data: {df.shape[0]} rows, years {df.year.min()}-{df.year.max()}")
    return df


# ---------- LOAD ----------
def load(df):
    os.makedirs("data", exist_ok=True)
    con = sqlite3.connect("data/worldbank.db")
    df.to_sql("indicators", con, if_exists="replace", index=False)
    con.close()
    df.to_csv("data/worldbank_clean.csv", index=False)
    print("Loaded to data/worldbank.db and data/worldbank_clean.csv")


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    load(transform(validate(extract())))