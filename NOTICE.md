# Origin and third-party notice

## Project origin

ANEMO is an original project developed by WASA Flight Environment Emulator (WASAFEE). The original implementation in this repository covers wind-field creation, data storage, data visualization, and weather-data processing.

This origin statement identifies the project and its development context. It does not state or imply endorsement, certification, or a safety guarantee by Waseda University, a competition organizer, a weather service, or any other third party.

## Third-party software and services

ANEMO uses third-party components under their own terms, including:

- [Leaflet](https://leafletjs.com/) 1.9.4 — BSD 2-Clause License. The installed license text is distributed in the npm package.
- [OpenStreetMap](https://www.openstreetmap.org/) map data and standard raster tiles — attribution and service-use requirements are described by [OpenStreetMap copyright](https://www.openstreetmap.org/copyright) and the [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).
- [Express](https://expressjs.com/), [node-postgres](https://node-postgres.com/), TypeScript, and other npm dependencies — see each installed package and `package-lock.json` for the exact version and license.
- Python packages listed in each `requirements.txt` — see each package's official distribution metadata for its license.
- PostgreSQL, Flyway, Docker, and Folium — see each project's official license and documentation.

Dependency names and licenses remain the property and responsibility of their respective authors. ANEMO's WASA-origin statement does not apply to those components.

## External data

The `batch_gpv_wind` component can retrieve and process Japan Meteorological Agency MSM GRIB2 data from an external archive. Data is not authored by WASA. Record the source, acquisition time, target time, transformation, and required attribution when using or publishing derived results. Confirm the current terms at the source and the [Japan Meteorological Agency content terms](https://www.jma.go.jp/jma/kishou/info/coment.html).

## Licensing scope

`wind_generator/package.json` declares the ISC license for that npm package. This notice does not expand, replace, or reinterpret licensing terms for other files. Before copying, redistributing, or relicensing repository content, confirm the applicable file-level and dependency terms with the repository maintainers.
