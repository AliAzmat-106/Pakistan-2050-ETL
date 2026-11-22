# Pakistan-2050-ETL
ETL pipeline + EDA + interactive dashboard on Pakistan's economy and population (World Bank data), with 2050 scenarios.

Pakistan in 2050: An ETL and EDA Project

This project looks at one question: where could Pakistan's economy and population be by 2050, and how does it compare with India, Bangladesh, China and the United States?

I pulled six indicators from the World Bank Open Data API (nominal GDP, PPP GDP, real GDP growth, population, population growth and GDP per capita) for six economies from 2000 to 2025. The data goes through a full ETL pipeline in Python: requests extracts it, Pydantic validates every record, pandas cleans it and fills only the gaps between years (no extrapolation), and the result is stored in SQLite with a CSV backup.

For the analysis, I checked whether Pakistan's economy has been growing faster than its population (real GDP growth was below population growth in several years), compared nominal GDP with PPP GDP (PPP is roughly 4x nominal for Pakistan), and compared Pakistan against the other countries on GDP per capita, growth and population.

I also worked out what it would take to reach a US$6 trillion economy by 2050. From about $407B in 2025, that needs roughly 11% nominal US$ growth every year, far above Pakistan's historical average. Three scenarios (Conservative, Baseline, High) show where the country could land, and the interactive dashboard lets you change the growth assumptions yourself.

Tech stack: Python, pandas, Pydantic, SQLite, Matplotlib, Chart.js, HTML/CSS/JavaScript.

These are scenarios, not forecasts.

I checked the 11% figure against your data: (6000 / 407.3)^(1/25) - 1 comes out to about 11.4%, so "roughly 11%" is accurate. If the platform has a character limit, tell me and I'll cut it down to 2 or 3 lines. Also tell me where you're pasting it (GitHub README, portfolio, a course submission) and I can adjust the tone.
