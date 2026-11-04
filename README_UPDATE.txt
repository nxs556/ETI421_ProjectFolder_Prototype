AeroTrack Flight Forecast Update
================================

Replace the current GitHub Pages website files with the contents of this folder.
All filenames belong in the root of your GitHub Pages repository.

Files:
  index.html
  forecast.html
  style.css
  script.js
  forecast.js
  flight_context.js     NEW, required by both HTML pages
  config.js             Existing Cognito and API URLs retained
  auth.js               Existing Cognito authentication retained
  SETUP_COGNITO.txt     Existing setup instructions

What's fixed:
  1. Flight searches now create a selected-flight context with flight number,
     unique flight instance ID when supplied by the backend, scheduled departure,
     departure airport, and arrival airport.
  2. Both the top Forecast navigation link and the "Forecast for this flight"
     button carry ?flight_id=... to the forecast page after selecting a flight.
  3. The forecast page shows the selected flight name, unique ID when provided,
     scheduled departure date, and the recorded route.
  4. Normal Forecast navigation without a flight ID starts a blank manual search.
     It no longer silently reuses the last searched route.
  5. If the flight backend provides a specific IATA or ICAO airport code,
     that code takes priority over a generic metropolitan code such as NYC.
  6. If the backend only provides NYC, LON, or another metropolitan code,
     the page requests an exact airport choice rather than silently assuming one.
  7. Known airport codes use local airport reference coordinates. An unknown
     airport can use exact backend coordinates if provided. City lookups are
     clearly marked approximate.
  8. The hourly flight-time forecast is separated from the 3 or 5 day forecast.
     Hourly temperatures and daily highs/lows naturally may differ.
  9. Your underscore naming convention remains in place for custom CSS classes,
     HTML IDs, and JavaScript variables/functions.
  10. Cognito sign-in and the API Gateway authorization token are unchanged.

IMPORTANT BACKEND LIMITATION
----------------------------
If your /flight Lambda route returns departure.airport = "NYC" instead of "JFK"
and has no precise airport fields, the frontend CANNOT independently know
whether it is JFK, LaGuardia, or Newark. It will request that the user choose
an airport. Choosing a different airport changes the forecast LOCATION, not
what FlightAware says about the flight.

For reliable automatic matching, update your Lambda /flight output to include
these fields when they are available from FlightAware:

{
  "flight": {
    "number": "AAL100",
    "fa_flight_id": "<FlightAware unique identifier>",
    "scheduled_departure": "<ISO-8601 timestamp>"
  },
  "departure": {
    "airport": "JFK",
    "code_iata": "JFK",
    "latitude": 40.6413,
    "longitude": -73.7781
  },
  "arrival": {
    "airport": "LHR",
    "code_iata": "LHR",
    "latitude": 51.4700,
    "longitude": -0.4543
  }
}

The example coordinates are airport reference points only, not a substitute for
actual API records. Flight numbers can be reused on different dates. To
pin a route search result to the SAME flight instance, /search should expose
a FlightAware unique flight ID and /flight should accept that ID. If the API
only supports a number like AAL100, flight instance selection remains ambiguous.

TEST STEPS
----------
1. Upload files and wait for GitHub Pages deployment.
2. Refresh the site to clear old JavaScript from browser cache.
3. Sign in via Cognito.
4. Search AAL100, click either the top Forecast tab or the flight-specific link.
5. Confirm the forecast page shows AAL100, its scheduled date, and route.
6. If the backend reports NYC, choose the correct airport. Do not assume JFK
   without confirming the flight's actual departure airport.
7. Search a route, open a specific flight, then open its forecast and verify
   the displayed flight ID matches the selected flight.
8. Click Forecast without a selected flight from a fresh session and check
   that the inputs begin empty.
9. Confirm requests to /flight still require Cognito authentication.

No AWS Lambda or API Gateway settings were changed by these frontend files.
