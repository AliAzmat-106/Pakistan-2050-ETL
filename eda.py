import sqlite3
import pandas as pd
import matplotlib.pyplot as plt

con = sqlite3.connect("data/worldbank.db")
df = pd.read_sql("SELECT * FROM indicators", con)
con.close()

pak = df[df.country_code == "PAK"].set_index("year")
last_year = int(pak.index.max())

print(df.info())
print(df.describe().T)
print("Missing values:\n", df.isna().sum())

# 1. Pakistan GDP vs population (2000 = 100)
idx = pak[["gdp_nominal", "population"]] / pak[["gdp_nominal", "population"]].iloc[0] * 100
idx.plot(title="Pakistan: GDP vs Population (2000 = 100)")
plt.ylabel("Index"); plt.show()

# 2. Kya GDP growth population growth se aage hai?
pak[["gdp_growth", "population_growth"]].plot(title="Pakistan: GDP growth vs Population growth (%)")
plt.axhline(0, color="black", lw=0.5); plt.show()
print("Years where real GDP growth < population growth:",
      int((pak.gdp_growth < pak.population_growth).sum()), "of", len(pak))

# 3. Nominal vs PPP
(pak[["gdp_nominal", "gdp_ppp"]] / 1e9).plot(title="Pakistan: Nominal vs PPP GDP (US$ billion)")
plt.show()
print("PPP / Nominal ratio (latest):", round(pak.ppp_to_nominal_ratio.iloc[-1], 2))

# 4. Country comparison
for col, title in [("gdp_per_capita", "GDP per capita (US$)"),
                   ("gdp_growth", "Real GDP growth (%)"),
                   ("population", "Population")]:
    df.pivot(index="year", columns="country", values=col).plot(title=title, logy=(col != "gdp_growth"))
    plt.show()

# 5. $6 trillion target
gdp0 = pak.gdp_nominal.iloc[-1]
pop0 = pak.population.iloc[-1]
years = 2050 - last_year
required = (6e12 / gdp0) ** (1 / years) - 1
print(f"\nLatest GDP ({last_year}): ${gdp0/1e9:.0f}B")
print(f"Required nominal USD growth for $6T by 2050: {required*100:.1f}% per year")

hist_years = last_year - int(pak.index.min())
hist_cagr = (gdp0 / pak.gdp_nominal.iloc[0]) ** (1 / hist_years) - 1
print(f"Historical nominal CAGR since 2000: {hist_cagr*100:.1f}%")

# 6. Scenarios
scenarios = {
    "Conservative": {"gdp_g": 0.05, "pop_g": 0.020},
    "Baseline":     {"gdp_g": 0.07, "pop_g": 0.017},
    "High":         {"gdp_g": 0.10, "pop_g": 0.014},
}
rows = []
for name, s in scenarios.items():
    gdp50 = gdp0 * (1 + s["gdp_g"]) ** years
    pop50 = pop0 * (1 + s["pop_g"]) ** years
    rows.append({"Scenario": name, "GDP 2050 ($T)": gdp50 / 1e12,
                 "Population 2050 (M)": pop50 / 1e6,
                 "GDP per capita 2050 ($)": gdp50 / pop50,
                 "% of $6T target": gdp50 / 6e12 * 100})
out = pd.DataFrame(rows).round(2)
print(out)

out.set_index("Scenario")["GDP 2050 ($T)"].plot(kind="bar", title="Pakistan GDP in 2050 by scenario")
plt.axhline(6, color="red", ls="--", label="$6T target"); plt.legend(); plt.show()