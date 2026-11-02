
"use strict";

const API_BASE_URL = "https://hkzcowus58.execute-api.us-east-1.amazonaws.com";
const $ = id => document.getElementById(id);

const flightTab = $("flightTab");
const routeTab = $("routeTab");
const flightForm = $("flightSearch");
const routeForm = $("routeSearch");
let busy = false;

function setMode(mode) {
  if (busy) return;
  const route = mode === "route";
  flightTab.classList.toggle("active", !route);
  routeTab.classList.toggle("active", route);
  flightTab.setAttribute("aria-selected", String(!route));
  routeTab.setAttribute("aria-selected", String(route));
  flightForm.classList.toggle("hidden", route);
  routeForm.classList.toggle("hidden", !route);
  $("errorMessage").classList.add("hidden");
  $("results").classList.add("hidden");
  $("routeResults").classList.add("hidden");
}

flightTab.addEventListener("click", () => setMode("flight"));
routeTab.addEventListener("click", () => setMode("route"));

function setText(id, value) {
  const el = $(id);
  if (el) {
    el.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);
  }
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

function formatDelay(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const minutes = Math.round(Number(seconds) / 60);
  if (!Number.isFinite(minutes)) return "—";
  if (minutes === 0) return "On time";

  return minutes < 0
    ? `${Math.abs(minutes)} min early`
    : `${minutes} min delayed`;
}

function weatherDescription(code) {
  const labels = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light rain showers",
    81: "Rain showers",
    82: "Heavy rain showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm with hail"
  };

  return labels[code] || "Conditions unavailable";
}

function weatherIcon(code) {
  if (code === 0 || code === 1) return "☀";
  if (code === 2 || code === 3) return "☁";
  if (code === 45 || code === 48) return "🌫";
  if (code >= 51 && code <= 67) return "🌧";
  if (code >= 71 && code <= 86) return "❄";
  if (code >= 95) return "⛈";
  return "🌤";
}

function displayWeather(prefix, airport) {
  setText(prefix + "WeatherCode", airport?.airport || "—");
  const weather = airport?.weather;

  if (!weather?.available) {
    setText(prefix + "Temp", "—");
    setText(prefix + "Condition", weather?.message || "Weather unavailable");
    setText(prefix + "Wind", "No current weather data");
    setText(prefix + "WeatherIcon", "🌤");
    return;
  }

  const current = weather.conditions || {};
  const units = weather.units || {};

  setText(
    prefix + "Temp",
    current.temperature_2m == null
      ? "—"
      : `${Math.round(Number(current.temperature_2m))}${units.temperature_2m || "°F"}`
  );

  setText(
    prefix + "Condition",
    current.weather_code == null
      ? "Conditions unavailable"
      : weatherDescription(Number(current.weather_code))
  );

  setText(
    prefix + "WeatherIcon",
    weatherIcon(Number(current.weather_code))
  );

  const details = [];

  if (current.wind_speed_10m != null) {
    details.push(
      `Wind: ${current.wind_speed_10m} ${units.wind_speed_10m || "mph"}`
    );
  }

  if (current.relative_humidity_2m != null) {
    details.push(`Humidity: ${current.relative_humidity_2m}%`);
  }

  if (current.precipitation != null) {
    details.push(
      `Precipitation: ${current.precipitation} ${units.precipitation || "mm"}`
    );
  }

  setText(prefix + "Wind", details.join(" | ") || "Unavailable");
}

function displayForecast(prefix, airport) {
  const forecast = airport?.weather?.forecast;

  setText(prefix + "ForecastCode", airport?.airport || "—");

  setText(
    prefix + "ForecastIcon",
    forecast?.available
      ? weatherIcon(Number(forecast.weather_code))
      : "🌤"
  );

  if (!forecast?.available) {
    setText(prefix + "ForecastTime", "—");
    setText(prefix + "ForecastTemp", "—");
    setText(
      prefix + "ForecastCondition",
      forecast?.message || "Forecast unavailable"
    );
    setText(prefix + "ForecastDetails", "No forecast data available");
    return;
  }

  setText(
    prefix + "ForecastTime",
    "Forecast hour: " + formatTime(forecast.forecast_time)
  );

  setText(
    prefix + "ForecastTemp",
    forecast.temperature == null
      ? "—"
      : `${Math.round(Number(forecast.temperature))}${forecast.temperature_unit || "°F"}`
  );

  setText(
    prefix + "ForecastCondition",
    forecast.weather_code == null
      ? "Conditions unavailable"
      : weatherDescription(Number(forecast.weather_code))
  );

  const details = [];

  if (forecast.wind_speed != null) {
    details.push(
      `Wind: ${forecast.wind_speed} ${forecast.wind_unit || "mph"}`
    );
  }

  if (forecast.precipitation_probability != null) {
    details.push(
      `Rain/snow chance: ${forecast.precipitation_probability}%`
    );
  }

  setText(
    prefix + "ForecastDetails",
    details.join(" | ") || "Forecast details unavailable"
  );
}

function renderFlight(data) {
  const { flight, departure, arrival } = data;

  if (!flight || !departure || !arrival) {
    throw new Error("Incomplete flight details received.");
  }

  setText("flightNumber", flight.number);
  setText("flightStatus", flight.status || "Unknown");
  setText("originCode", departure.airport);
  setText("originName", departure.name || departure.city);
  setText("destinationCode", arrival.airport);
  setText("destinationName", arrival.name || arrival.city);

  setText(
    "departureTime",
    formatTime(flight.estimated_departure || flight.scheduled_departure)
  );

  setText(
    "arrivalTime",
    formatTime(flight.estimated_arrival || flight.scheduled_arrival)
  );

  setText(
    "departureDelay",
    formatDelay(flight.departure_delay_seconds)
  );

  setText(
    "arrivalDelay",
    formatDelay(flight.arrival_delay_seconds)
  );

  setText("aircraft", flight.aircraft_type || "Not provided");

  displayWeather("origin", departure);
  displayWeather("destination", arrival);
  displayForecast("origin", departure);
  displayForecast("destination", arrival);

  const status = String(flight.status || "").toLowerCase();
  const badge = $("flightStatus");

  badge.className = "flight-badge";

  if (status.includes("cancel")) {
    badge.classList.add("cancelled");
  } else if (status.includes("delay")) {
    badge.classList.add("delayed");
  } else if (
    status.includes("air") ||
    status.includes("route")
  ) {
    badge.classList.add("airborne");
  }

  $("results").classList.remove("hidden");
  $("results").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function showError(message) {
  setText("errorMessage", message);
  $("errorMessage").classList.remove("hidden");
}

function setLoading(active, message) {
  busy = active;
  $("loading").classList.toggle("hidden", !active);
  setText("loadingText", message);

  document.querySelectorAll(".action-btn").forEach(button => {
    button.disabled = active;
  });
}

async function fetchAPI(path, params) {
  const url = new URL(API_BASE_URL + path);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" }
  });

  let data;

  try {
    data = await response.json();

    if (typeof data.body === "string") {
      data = JSON.parse(data.body);
    }
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || data.error) {
    throw new Error(
      data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

async function trackFlight(flightId, preserveRouteResults = false) {
  if (busy) return;

  const id = flightId.trim().toUpperCase();

  if (!/^[A-Z0-9]{2,10}$/.test(id)) {
    return showError(
      "Enter a valid flight number, such as AA100."
    );
  }

  $("errorMessage").classList.add("hidden");
  $("results").classList.add("hidden");

  if (!preserveRouteResults) {
    $("routeResults").classList.add("hidden");
  }

  setLoading(true, "Loading flight and airport weather...");

  try {
    const data = await fetchAPI("/flight", {
      flight_id: id
    });

    renderFlight(data);
  } catch (error) {
    showError(
      error.message || "Unable to retrieve flight details."
    );
  } finally {
    setLoading(false, "");
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text != null) element.textContent = text;

  return element;
}

function renderRouteResults(data) {
  const flights = Array.isArray(data.flights)
    ? data.flights
    : [];

  setText(
    "routeResultsTitle",
    `${data.origin || "Origin"} to ${data.destination || "Destination"}`
  );

  setText("resultCount", `${flights.length} flights`);

  const list = $("flightList");
  list.replaceChildren();

  if (!flights.length) {
    list.append(
      makeElement(
        "div",
        "empty-state",
        "No flights were found for this route. Try different airport codes."
      )
    );
  }

  flights.forEach(flight => {
    const card = makeElement("article", "list-card");
    const content = makeElement("div", "list-content");

    content.append(
      makeElement(
        "div",
        "list-flight",
        flight.number || "Flight number unavailable"
      )
    );

    content.append(
      makeElement(
        "div",
        "list-route",
        `${flight.origin?.airport || data.origin || "—"} ✈ ${flight.destination?.airport || data.destination || "—"}`
      )
    );

    content.append(
      makeElement(
        "div",
        "list-meta",
        `${flight.status || "Status unknown"} · Departs ${formatTime(flight.estimated_departure || flight.scheduled_departure)}`
      )
    );

    content.append(
      makeElement(
        "div",
        "list-meta",
        `Arrives ${formatTime(flight.estimated_arrival || flight.scheduled_arrival)}`
      )
    );

    card.append(content);

    const button = makeElement(
      "button",
      "list-action action-btn",
      "View details"
    );

    button.type = "button";

    if (!flight.number) {
      button.disabled = true;
    } else {
      button.addEventListener("click", () => {
        trackFlight(flight.number, true);
      });
    }

    card.append(button);
    list.append(card);
  });

  $("routeResults").classList.remove("hidden");

  $("routeResults").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

flightForm.addEventListener("submit", event => {
  event.preventDefault();
  trackFlight($("flightInput").value);
});

routeForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (busy) return;

  const origin = $("originInput").value.trim().toUpperCase();
  const destination = $("destinationInput").value.trim().toUpperCase();

  if (
    !/^[A-Z]{3,4}$/.test(origin) ||
    !/^[A-Z]{3,4}$/.test(destination)
  ) {
    return showError(
      "Enter valid three or four letter airport codes."
    );
  }

  if (origin === destination) {
    return showError(
      "Departure and arrival airports must be different."
    );
  }

  $("errorMessage").classList.add("hidden");
  $("results").classList.add("hidden");
  $("routeResults").classList.add("hidden");

  setLoading(true, "Finding flights on your route...");

  try {
    const data = await fetchAPI("/search", {
      origin,
      destination
    });

    renderRouteResults(data);
  } catch (error) {
    showError(
      error.message || "Unable to search this route."
    );
  } finally {
    setLoading(false, "");
  }
});