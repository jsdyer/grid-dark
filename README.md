# Grid Dark

[Compare utility and internet measurements](https://coolcode.ca/grid-dark/)

Explore Hurricane Fiona in Nova Scotia in 2022 and the November 2024 Vancouver Island windstorm. Match dated electricity bulletins with hourly provincial internet measurements, inspect the lowest hour by metric and download the comparison. Two recent views and a growing daily internet archive cover British Columbia and Nova Scotia.

<!-- coolcode:guide -->
During Fiona, Nova Scotia’s lowest hourly active-probing signal was 46.0% of its reference median, while the lowest routing signal was 93.4%. Switch measurements, then select a dated utility row to inspect what each source recorded around the same hour.
<!-- /coolcode:guide -->

## Read the measures

[Georgia Tech IODA](https://ioda.inetintel.cc.gatech.edu/) provides regional active-probing and BGP measurements. An active-probing observation counts responsive /24 network blocks. BGP measures the visible routed address space in /24 units. An internet signal of 46% describes a relative measurement. It cannot give the fraction of homes that lost internet. A province-wide series can conceal a local failure. Coincident movements alone cannot identify the cause or an individual household's restoration time.

For each interval, the collector calculates hourly medians of native samples. At least half the expected samples must be present. It takes the median of usable hourly values in the seven days immediately preceding the interval and expresses each hour as a percentage of that baseline. At least 84 baseline hours are required. Missing hours appear as gaps and empty CSV values. Hour selection uses UTC internally and displays local time by default.

Power references contain original factual annotations linked to dated [BC Hydro](https://www.bchydro.com/news/press_centre/news_releases/2024/november-island-windstorm.html) and [Nova Scotia Power](https://www.nspower.ca/about-us/press-releases/2022/09/26/ns-power-hurricane-fiona-update) bulletins. They preserve approximate amounts, geography, publication precision and the measure in each bulletin. BC Hydro's later updates narrow to island customers. Nova Scotia Power's figures count cumulative restorations. Calendar-day-only updates cannot be matched to one hour. The launch edition has ten utility entries. Further power events are manually source-checked. Current utility maps are linked directly. See [BC Hydro legal](https://www.bchydro.com/siteinfo/legal.html), [Nova Scotia Power legal](https://www.nspower.ca/legal) and [IODA’s guidance for analyzing and sharing signal data](https://ioda.inetintel.cc.gatech.edu/reports/ioda-markup/).

## Refresh and scope

A daily GitHub Action retrieves IODA regional signals for codes 583 and 576. It computes original summary statistics and links the dated source query for each series. It does not mirror the utility outage maps or republish the IODA raw series. The recent week ends before the previous local day to accommodate reporting delays. The archive retains its first complete daily result per province, with the capture's reference window identified. Data collection began November 19, 2026. A later run can fill a missing day within the rolling period. Coverage outside the two published storms and capture period is unavailable.

Use a current Python 3 standard library and Node. Run `python scripts/refresh.py` to retrieve data, `node --test tests/*.test.mjs` and `python -m unittest discover -s tests` for checks and `python scripts/build.py` for an offline build. Browser smoke tests exercise the storm and metric selectors, hour matching, CSV export, both recent provincial views and the phone layout before Pages deployment. Files are served statically.

<!-- schedule-reliability -->
## Schedule reliability

Public GitHub repositories can have scheduled workflows disabled after 60 days of inactivity. A separate weekly [schedule guard](.github/workflows/schedule-guard.yml) calls GitHub's enable-workflow API for an explicit list of refresh workflows and itself. It can restore workflows disabled for inactivity, preserves manually disabled workflows, and runs independently of collection failures.

This is an interim mitigation, not a scheduling guarantee: GitHub does not document active-workflow renewal as a permanent exemption, and scheduled runs can be delayed or dropped. A scheduler on our own Linux server is the planned independent trigger. The guard does not collect data, create dummy commits, or change source/check timestamps; successful collection and published data freshness still need monitoring.
<!-- /schedule-reliability -->
