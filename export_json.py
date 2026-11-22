import os
import sqlite3
import pandas as pd

os.makedirs("site", exist_ok=True)
con = sqlite3.connect("data/worldbank.db")
df = pd.read_sql("SELECT * FROM indicators", con)
con.close()
df.round(4).to_json("site/data.json", orient="records", indent=2)
print("Saved site/data.json:", len(df), "rows")