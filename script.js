"use strict";

const API_BASE_URL = window.AEROTRACK_CONFIG.api_base_url;
const $ = (id) => document.getElementById(id);

const flightTab = $("flight_tab");
const routeTab = $("route_tab");
const flightForm = $("flight_form");
const routeForm = $("route_form");
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
  $("error_message").classList.add("hidden");
  $("results").classList.add("hidden");
  $("route_results").classList.add("hidden");
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
    timeZoneName: "short",
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
    99: "Severe thunderstorm with hail",
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
  setText(prefix + "_weather_code", airport?.airport || "—");
  const weather = airport?.weather;

  if (!weather?.available) {
    setText(prefix + "_temp", "—");
    setText(prefix + "_condition", weather?.message || "Weather unavailable");
    setText(prefix + "_wind", "No current weather data");
    setText(prefix + "_weather_icon", "🌤");
    return;
  }

  const current = weather.conditions || {};
  const units = weather.units || {};

  setText(
    prefix + "_temp",
    current.temperature_2m == null
      ? "—"
      : `${Math.round(Number(current.temperature_2m))}${units.temperature_2m || "°F"}`,
  );

  setText(
    prefix + "_condition",
    current.weather_code == null
      ? "Conditions unavailable"
      : weatherDescription(Number(current.weather_code)),
  );

  setText(prefix + "_weather_icon", weatherIcon(Number(current.weather_code)));

  const details = [];

  if (current.wind_speed_10m != null) {
    details.push(
      `Wind: ${current.wind_speed_10m} ${units.wind_speed_10m || "mph"}`,
    );
  }

  if (current.relative_humidity_2m != null) {
    details.push(`Humidity: ${current.relative_humidity_2m}%`);
  }

  if (current.precipitation != null) {
    details.push(
      `Precipitation: ${current.precipitation} ${units.precipitation || "mm"}`,
    );
  }

  setText(prefix + "_wind", details.join(" | ") || "Unavailable");
}

function displayForecast(prefix, airport) {
  const forecast = airport?.weather?.forecast;

  setText(prefix + "_forecast_code", airport?.airport || "—");

  setText(
    prefix + "_forecast_icon",
    forecast?.available ? weatherIcon(Number(forecast.weather_code)) : "🌤",
  );

  if (!forecast?.available) {
    setText(prefix + "_forecast_time", "—");
    setText(prefix + "_forecast_temp", "—");
    setText(
      prefix + "_forecast_condition",
      forecast?.message || "Forecast unavailable",
    );
    setText(prefix + "_forecast_details", "No forecast data available");
    return;
  }

  setText(
    prefix + "_forecast_time",
    "Forecast hour: " + formatTime(forecast.forecast_time),
  );

  setText(
    prefix + "_forecast_temp",
    forecast.temperature == null
      ? "—"
      : `${Math.round(Number(forecast.temperature))}${forecast.temperature_unit || "°F"}`,
  );

  setText(
    prefix + "_forecast_condition",
    forecast.weather_code == null
      ? "Conditions unavailable"
      : weatherDescription(Number(forecast.weather_code)),
  );

  const details = [];

  if (forecast.wind_speed != null) {
    details.push(`Wind: ${forecast.wind_speed} ${forecast.wind_unit || "mph"}`);
  }

  if (forecast.precipitation_probability != null) {
    details.push(`Rain/snow chance: ${forecast.precipitation_probability}%`);
  }

  setText(
    prefix + "_forecast_details",
    details.join(" | ") || "Forecast details unavailable",
  );
}

function renderFlight(data) {
  const { flight, departure, arrival } = data;

  if (!flight || !departure || !arrival) {
    throw new Error("Incomplete flight details received.");
  }

  setText("flight_number", flight.number);
  setText("flight_status", flight.status || "Unknown");
  setText("origin_code", departure.airport);
  setText("origin_name", departure.name || departure.city);
  setText("destination_code", arrival.airport);
  setText("destination_name", arrival.name || arrival.city);

  setText(
    "departure_time",
    formatTime(flight.estimated_departure || flight.scheduled_departure),
  );

  setText(
    "arrival_time",
    formatTime(flight.estimated_arrival || flight.scheduled_arrival),
  );

  setText("departure_delay", formatDelay(flight.departure_delay_seconds));

  setText("arrival_delay", formatDelay(flight.arrival_delay_seconds));

  setText("aircraft", flight.aircraft_type || "Not provided");

  sessionStorage.setItem(
    "aero_airports",
    JSON.stringify({
      origin: {
        code: departure.airport,
        name: departure.name,
        city: departure.city,
        latitude:
          departure.latitude ?? departure.lat ?? departure.weather?.latitude,
        longitude:
          departure.longitude ?? departure.lon ?? departure.weather?.longitude,
      },
      destination: {
        code: arrival.airport,
        name: arrival.name,
        city: arrival.city,
        latitude: arrival.latitude ?? arrival.lat ?? arrival.weather?.latitude,
        longitude:
          arrival.longitude ?? arrival.lon ?? arrival.weather?.longitude,
      },
    }),
  );
  displayWeather("origin", departure);
  displayWeather("destination", arrival);
  displayForecast("origin", departure);
  displayForecast("destination", arrival);

  const status = String(flight.status || "").toLowerCase();
  const badge = $("flight_status");

  badge.className = "flight_badge";

  if (status.includes("cancel")) {
    badge.classList.add("cancelled");
  } else if (status.includes("delay")) {
    badge.classList.add("delayed");
  } else if (status.includes("air") || status.includes("route")) {
    badge.classList.add("airborne");
  }

  $("results").classList.remove("hidden");
  $("results").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function showError(message) {
  setText("error_message", message);
  $("error_message").classList.remove("hidden");
}

function setLoading(active, message) {
  busy = active;
  $("loading").classList.toggle("hidden", !active);
  setText("loading_text", message);

  document.querySelectorAll(".action_button").forEach((button) => {
    button.disabled = active;
  });
}

async function fetchAPI(path, params) {
  const url = new URL(API_BASE_URL + path);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(window.AEROTRACK_CONFIG.require_auth && window.aero_auth?.get_token()
        ? { Authorization: `Bearer ${window.aero_auth.get_token()}` }
        : {}),
    },
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
    throw new Error(data.error || `Request failed (${response.status}).`);
  }

  return data;
}

async function trackFlight(flightId, preserveRouteResults = false) {
  if (busy) return;

  const id = flightId.trim().toUpperCase();

  if (!/^[A-Z0-9]{2,25}$/.test(id)) {
    return showError(
      "Enter a flight number or identifier, such as AA100 or AAL100.",
    );
  }

  $("error_message").classList.add("hidden");
  $("results").classList.add("hidden");

  if (!preserveRouteResults) {
    $("route_results").classList.add("hidden");
  }

  setLoading(true, "Loading flight and airport weather...");

  try {
    const data = await fetchAPI("/flight", {
      flight_id: id,
    });

    renderFlight(data);
  } catch (error) {
    showError(error.message || "Unable to retrieve flight details.");
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
  const flights = Array.isArray(data.flights) ? data.flights : [];

  setText(
    "route_results_title",
    `${data.origin || "Origin"} to ${data.destination || "Destination"}`,
  );

  setText("result_count", `${flights.length} flights`);

  const list = $("flight_list");
  list.replaceChildren();

  if (!flights.length) {
    list.append(
      makeElement(
        "div",
        "empty_state",
        "No flights were found for this route. Try different airport codes.",
      ),
    );
  }

  flights.forEach((flight) => {
    const card = makeElement("article", "list_card");
    const content = makeElement("div", "list_content");

    content.append(
      makeElement(
        "div",
        "list_flight",
        flight.number || "Flight number unavailable",
      ),
    );

    content.append(
      makeElement(
        "div",
        "list_route",
        `${flight.origin?.airport || data.origin || "—"} ✈ ${flight.destination?.airport || data.destination || "—"}`,
      ),
    );

    content.append(
      makeElement(
        "div",
        "list_meta",
        `${flight.status || "Status unknown"} · Departs ${formatTime(flight.estimated_departure || flight.scheduled_departure)}`,
      ),
    );

    content.append(
      makeElement(
        "div",
        "list_meta",
        `Arrives ${formatTime(flight.estimated_arrival || flight.scheduled_arrival)}`,
      ),
    );

    card.append(content);

    const button = makeElement(
      "button",
      "list_action action_button",
      "View details",
    );

    button.type = "button";

    if (!flight.number) {
      button.disabled = true;
    } else {
      button.addEventListener("click", () => {
        window.aero_selected_flight = String(flight.number).toUpperCase();
        applyRouteFilter();
        trackFlight(flight.number, true);
      });
    }

    card.dataset.flight_number = String(flight.number || "").toUpperCase();
    card.dataset.filter_text = [
      flight.number,
      flight.airline,
      flight.airline_name,
      flight.operator,
      flight.status,
      flight.origin?.airport,
      flight.destination?.airport,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    card.append(button);
    list.append(card);
  });

  $("route_results").classList.remove("hidden");
  $("route_filter").value = "";
  window.aero_selected_flight = "";
  applyRouteFilter();

  $("route_results").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

flightForm.addEventListener("submit", (event) => {
  event.preventDefault();
  trackFlight($("flight_input").value);
});

routeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy) return;

  const origin = $("origin_input").value.trim().toUpperCase();
  const destination = $("destination_input").value.trim().toUpperCase();

  if (!/^[A-Z]{3,4}$/.test(origin) || !/^[A-Z]{3,4}$/.test(destination)) {
    return showError("Enter valid three or four letter airport codes.");
  }

  if (origin === destination) {
    return showError("Departure and arrival airports must be different.");
  }

  $("error_message").classList.add("hidden");
  $("results").classList.add("hidden");
  $("route_results").classList.add("hidden");

  setLoading(true, "Finding flights on your route...");

  try {
    const data = await fetchAPI("/search", {
      origin,
      destination,
    });

    renderRouteResults(data);
  } catch (error) {
    showError(error.message || "Unable to search this route.");
  } finally {
    setLoading(false, "");
  }
});

function applyRouteFilter() {
  const search = $("route_filter").value.trim().toLowerCase();
  const selected_only = $("hide_other_flights").checked;
  let shown = 0;
  document.querySelectorAll("#flight_list .list_card").forEach((card) => {
    const matches_text = !search || card.dataset.filter_text.includes(search);
    const matches_selected =
      !selected_only ||
      !window.aero_selected_flight ||
      card.dataset.flight_number === window.aero_selected_flight;
    const visible = matches_text && matches_selected;
    card.classList.toggle("hidden", !visible);
    if (visible) shown++;
  });
  $("route_filter_note").textContent =
    `${shown} matching flights shown. Filtering uses data returned by your route search API.`;
}
$("route_filter").addEventListener("input", applyRouteFilter);
$("hide_other_flights").addEventListener("change", applyRouteFilter);
