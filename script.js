
"use strict";

const API_BASE_URL =
  "https://hkzcowus58.execute-api.us-east-1.amazonaws.com";

const $ = id => document.getElementById(id);

let activeRequest = 0;
let isLoading = false;

// Search tabs

$("flightTab").addEventListener("click", () => {
  switchSearchMode("flight");
});

$("routeTab").addEventListener("click", () => {
  switchSearchMode("route");
});

function switchSearchMode(mode) {
  if (isLoading) return;

  const flightMode = mode === "flight";

  $("flightForm").classList.toggle("hidden", !flightMode);
  $("routeForm").classList.toggle("hidden", flightMode);

  $("flightTab").classList.toggle("active", flightMode);
  $("routeTab").classList.toggle("active", !flightMode);

  $("flightTab").setAttribute("aria-pressed", String(flightMode));
  $("routeTab").setAttribute("aria-pressed", String(!flightMode));

  hideError();
  $("results").classList.add("hidden");
  $("routeResults").classList.add("hidden");
}

// Form submissions

$("flightForm").addEventListener("submit", event => {
  event.preventDefault();
  trackFlight();
});

$("routeForm").addEventListener("submit", event => {
  event.preventDefault();
  searchRoute();
});

// Utilities

function setText(id, value) {
  const element = $(id);

  if (!element) return;

  element.textContent =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
}

function showError(message) {
  setText("errorMessage", message);
  $("errorMessage").classList.remove("hidden");
}

function hideError() {
  $("errorMessage").classList.add("hidden");
}

function setLoading(loading, message = "Searching flight information...") {
  isLoading = loading;

  $("loading").classList.toggle("hidden", !loading);
  setText("loadingText", message);

  document.querySelectorAll(
    "#flightForm button, #routeForm button, .search-tab, .details-button"
  ).forEach(button => {
    button.disabled = loading;
  });
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
  if (seconds === null || seconds === undefined) {
    return "—";
  }

  const minutes = Math.round(Number(seconds) / 60);

  if (!Number.isFinite(minutes)) return "—";

  if (minutes === 0) return "On time";

  if (minutes < 0) {
    return Math.abs(minutes) + " min early";
  }

  return minutes + " min delayed";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("cancel")) return "cancelled";
  if (value.includes("delay")) return "delayed";

  if (
    value.includes("air") ||
    value.includes("route")
  ) {
    return "airborne";
  }

  return "";
}

function createStatusBadge(status) {
  const badge = document.createElement("span");

  badge.className = "flight-badge";

  const className = statusClass(status);

  if (className) badge.classList.add(className);

  badge.textContent = status || "Unknown";

  return badge;
}

// API communication

async function fetchAPI(endpoint, params) {
  const url = new URL(
    API_BASE_URL.replace(/\/+$/, "") + endpoint
  );

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  // Supports Lambda responses that contain a body field.
  if (typeof data.body === "string") {
    data = JSON.parse(data.body);
  } else if (data.body && typeof data.body === "object") {
    data = data.body;
  }

  if (!response.ok || data.error) {
    throw new Error(
      data.error || "Request failed with status " + response.status
    );
  }

  return data;
}

// Flight number search

async function trackFlight(flightNumber = null) {
  if (isLoading) return;

  const flightId = String(
    flightNumber || $("flightInput").value
  ).trim().toUpperCase();

  if (!/^[A-Z0-9]{2,10}$/.test(flightId)) {
    showError("Please enter a valid flight number.");
    return;
  }

  const requestId = ++activeRequest;

  hideError();
  $("results").classList.add("hidden");

  setLoading(true, "Retrieving flight details and airport weather...");

  try {
    const data = await fetchAPI("/flight", {
      flight_id: flightId
    });

    if (requestId !== activeRequest) return;

    renderFlight(data);

    $("results").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("Flight lookup error:", error);
    showError(error.message || "Unable to retrieve flight details.");

  } finally {
    setLoading(false);
  }
}

// Airport route search

async function searchRoute() {
  if (isLoading) return;

  const origin = $("originInput").value.trim().toUpperCase();
  const destination = $("destinationInput").value.trim().toUpperCase();

  if (
    !/^[A-Z]{3,4}$/.test(origin) ||
    !/^[A-Z]{3,4}$/.test(destination)
  ) {
    showError("Enter valid three or four letter airport codes.");
    return;
  }

  if (origin === destination) {
    showError("Departure and arrival airports must be different.");
    return;
  }

  const requestId = ++activeRequest;

  hideError();

  $("results").classList.add("hidden");
  $("routeResults").classList.add("hidden");

  setLoading(true, "Finding flights between airports...");

  try {
    const data = await fetchAPI("/search", {
      origin,
      destination
    });

    if (requestId !== activeRequest) return;

    renderRouteResults(data);

    $("routeResults").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("Route search error:", error);
    showError(error.message || "Unable to search this route.");

  } finally {
    setLoading(false);
  }
}

// Display route search results

function renderRouteResults(data) {
  const flights = Array.isArray(data.flights)
    ? data.flights
    : [];

  setText(
    "routeTitle",
    (data.origin || "Origin") + " → " +
    (data.destination || "Destination")
  );

  setText(
    "routeCount",
    flights.length + (
      flights.length === 1
        ? " flight found"
        : " flights found"
    )
  );

  const list = $("flightList");
  list.replaceChildren();

  if (!flights.length) {
    const empty = document.createElement("div");
    empty.className = "empty-results";
    empty.textContent =
      "No flights were found for this route. Try another airport pair.";

    list.appendChild(empty);
    $("routeResults").classList.remove("hidden");
    return;
  }

  flights.forEach(flight => {
    const card = document.createElement("article");
    card.className = "route-result-card";

    const top = document.createElement("div");
    top.className = "result-top";

    const number = document.createElement("div");
    number.className = "result-number";
    number.textContent = flight.number || "Unknown flight";

    top.append(number, createStatusBadge(flight.status));

    const route = document.createElement("div");
    route.className = "result-route";

    const origin = createRouteAirport(
      flight.origin?.airport || data.origin,
      flight.estimated_departure || flight.scheduled_departure,
      false
    );

    const plane = document.createElement("div");
    plane.className = "result-plane";
    plane.textContent = "✈";

    const destination = createRouteAirport(
      flight.destination?.airport || data.destination,
      flight.estimated_arrival || flight.scheduled_arrival,
      true
    );

    route.append(origin, plane, destination);

    const bottom = document.createElement("div");
    bottom.className = "result-bottom";

    const delay = document.createElement("div");
    delay.className = "result-delay";
    delay.textContent =
      "Departure: " + formatDelay(flight.departure_delay_seconds);

    const button = document.createElement("button");
    button.className = "details-button";
    button.type = "button";
    button.textContent = "View Flight Details →";

    const flightNumber = flight.number;

    if (!flightNumber) {
      button.disabled = true;
      button.textContent = "Details unavailable";
    } else {
      button.addEventListener("click", () => {
        trackFlight(flightNumber);
      });
    }

    bottom.append(delay, button);
    card.append(top, route, bottom);
    list.appendChild(card);
  });

  $("routeResults").classList.remove("hidden");
}

function createRouteAirport(code, time, alignRight) {
  const wrapper = document.createElement("div");

  wrapper.className = alignRight
    ? "result-airport right"
    : "result-airport";

  const airportCode = document.createElement("div");
  airportCode.className = "result-code";
  airportCode.textContent = code || "—";

  const flightTime = document.createElement("div");
  flightTime.className = "result-time";
  flightTime.textContent = formatTime(time);

  wrapper.append(airportCode, flightTime);

  return wrapper;
}

// Display individual flight

function renderFlight(data) {
  const flight = data.flight;
  const origin = data.departure;
  const destination = data.arrival;

  if (!flight || !origin || !destination) {
    throw new Error("The flight response is missing required data.");
  }

  setText("flightNumber", flight.number);
  setText("flightStatus", flight.status || "Unknown");

  setText("originCode", origin.airport);
  setText("originName", origin.name || origin.city);

  setText("destinationCode", destination.airport);
  setText("destinationName", destination.name || destination.city);

  setText(
    "departureTime",
    formatTime(
      flight.estimated_departure || flight.scheduled_departure
    )
  );

  setText(
    "arrivalTime",
    formatTime(
      flight.estimated_arrival || flight.scheduled_arrival
    )
  );

  setText(
    "departureDelay",
    formatDelay(flight.departure_delay_seconds)
  );

  setText(
    "arrivalDelay",
    formatDelay(flight.arrival_delay_seconds)
  );

  setText(
    "aircraft",
    flight.aircraft_type || "Not provided"
  );

  const badge = $("flightStatus");
  badge.className = "flight-badge";

  const className = statusClass(flight.status);

  if (className) badge.classList.add(className);

  displayWeather("origin", origin);
  displayWeather("destination", destination);

  $("results").classList.remove("hidden");
}

// Weather descriptions

function weatherDescription(code) {
  const descriptions = {
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

  return descriptions[code] || "Conditions unavailable";
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

// Display airport weather

function displayWeather(prefix, airport) {
  const airportCode = airport?.airport || "—";
  const weather = airport?.weather;

  setText(prefix + "WeatherCode", airportCode);

  if (!weather || !weather.available) {
    setText(prefix + "Temp", "—");
    setText(prefix + "Condition", "Weather unavailable");
    setText(prefix + "Wind", "No weather data available");
    setText(prefix + "WeatherIcon", "🌤");
    return;
  }

  const current = weather.conditions || {};
  const units = weather.units || {};

  const temperature = current.temperature_2m;
  const wind = current.wind_speed_10m;
  const humidity = current.relative_humidity_2m;
  const precipitation = current.precipitation;
  const code = current.weather_code;

  const temperatureUnit = units.temperature_2m || "°F";
  const windUnit = units.wind_speed_10m || "mph";
  const precipitationUnit = units.precipitation || "mm";

  setText(
    prefix + "Temp",
    temperature != null
      ? Math.round(Number(temperature)) + temperatureUnit
      : "—"
  );

  setText(
    prefix + "Condition",
    code != null
      ? weatherDescription(Number(code))
      : "Conditions unavailable"
  );

  setText(
    prefix + "WeatherIcon",
    code != null ? weatherIcon(Number(code)) : "🌤"
  );

  const details = [];

  if (wind != null) {
    details.push("Wind: " + wind + " " + windUnit);
  }

  if (humidity != null) {
    details.push("Humidity: " + humidity + "%");
  }

  if (precipitation != null) {
    details.push(
      "Precipitation: " + precipitation + " " + precipitationUnit
    );
  }

  setText(
    prefix + "Wind",
    details.length ? details.join(" | ") : "Unavailable"
  );
}