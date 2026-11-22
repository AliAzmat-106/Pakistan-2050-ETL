# Pakistan-2050-ETL
ETL pipeline + EDA + interactive dashboard on Pakistan's economy and population (World Bank data), with 2050 scenarios.

Pakistan in 2050: An ETL and EDA Project

This project looks at one question: where could Pakistan's economy and population be by 2050, and how does it compare with India, Bangladesh, China and the United States?

I pulled six indicators from the World Bank Open Data API (nominal GDP, PPP GDP, real GDP growth, population, population growth and GDP per capita) for six economies from 2000 to 2025. The data goes through a full ETL pipeline in Python: requests extracts it, Pydantic validates every record, pandas cleans it and fills only the gaps between years (no extrapolation), and the result is stored in SQLite with a CSV backup.

For the analysis, I checked whether Pakistan's economy has been growing faster than its population (real GDP growth was below population growth in several years), compared nominal GDP with PPP GDP (PPP is roughly 4x nominal for Pakistan), and compared Pakistan against the other countries on GDP per capita, growth and population.

I also worked out what it would take to reach a US$6 trillion economy by 2050. From about $407B in 2025, that needs roughly 11% nominal US$ growth every year, far above Pakistan's historical average. Three scenarios (Conservative, Baseline, High) show where the country could land, and the interactive dashboard lets you change the growth assumptions yourself.

Tech stack: Python, pandas, Pydantic, SQLite, Matplotlib, Chart.js, HTML/CSS/JavaScript.

These are scenarios, not forecasts.

How to run:

To view the dashboard, clone or download this repo, open the folder in VS Code, and right-click site/index.html and choose Open with Live Server. No Python is needed, since the processed data is already included in site/data.json. If you want to rebuild the data from the World Bank API, install the requirements with pip install requests pandas pydantic matplotlib, then run python etl.py followed by python export_json.py.
