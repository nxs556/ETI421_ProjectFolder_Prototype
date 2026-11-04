"use strict";
// Airport-specific daily forecasts plus the selected flight's hourly forecasts.
const by_id = (id) => document.getElementById(id);
const airport_tools = window.aero_flight_context;
let forecast_days = 5;
let selected_flight = null;
let running_search = false;
let search_generation = 0;

const descriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms with hail",
  99: "Severe thunderstorms",
};
const weather_description = (code) =>
  descriptions[Number(code)] || "Variable conditions";
const weather_symbol = (code) =>
  Number(code) >= 95
    ? "⛈️"
    : Number(code) >= 71 && Number(code) <= 86
      ? "❄️"
      : Number(code) >= 51 && Number(code) <= 82
        ? "🌧️"
        : Number(code) >= 45 && Number(code) <= 48
          ? "🌫️"
          : Number(code) === 0
            ? "☀️"
            : "⛅";
function element(tag, class_name, value) {
  const result = document.createElement(tag);
  if (class_name) result.className = class_name;
  if (value !== undefined && value !== null) result.textContent = String(value);
  return result;
}
function show_error(message) {
  by_id("forecast_error").textContent = String(message);
  by_id("forecast_error").classList.remove("hidden");
}
function date_text(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
function valid_coordinates(latitude, longitude) {
  return (
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    latitude !== null &&
    longitude !== null &&
    latitude !== "" &&
    longitude !== "" &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}
function matching_airport(input, existing) {
  const entered = airport_tools.normalize_code(input);
  return (
    existing &&
    entered &&
    entered === airport_tools.normalize_code(existing.code)
  );
}
function show_airport_choice(which) {
  const input = by_id(`${which}_input`);
  const select = by_id(`${which}_airport_choice`);
  const box = by_id(`${which}_airport_choice_box`);
  const code = airport_tools.normalize_code(input.value);
  const group = airport_tools.metro_codes[code];
  select.replaceChildren();
  box.classList.toggle("hidden", !group);
  if (!group) return;
  select.append(
    element("option", "", `Select an airport serving ${group.city}`),
  );
  select.firstElementChild.value = "";
  group.codes.forEach((airport_code) => {
    const airport = airport_tools.local_airport(airport_code);
    const option = element(
      "option",
      "",
      `${airport_code} · ${airport?.name || airport_code}`,
    );
    option.value = airport_code;
    select.append(option);
  });
}
function update_flight_override() {
  const warning = by_id("flight_override_notice");
  if (!selected_flight) return;
  const entered_origin = airport_tools.normalize_code(
    by_id("origin_input").value,
  );
  const entered_destination = airport_tools.normalize_code(
    by_id("destination_input").value,
  );
  const original_origin = airport_tools.normalize_code(
    selected_flight.origin?.code,
  );
  const original_destination = airport_tools.normalize_code(
    selected_flight.destination?.code,
  );
  const changed =
    entered_origin !== original_origin ||
    entered_destination !== original_destination;
  const metro = Boolean(
    airport_tools.metro_codes[entered_origin] ||
    airport_tools.metro_codes[entered_destination],
  );
  if (changed) {
    warning.textContent = `Airport override: the flight API reported ${original_origin || "unknown"} → ${original_destination || "unknown"}, but your weather request uses ${entered_origin || "unknown"} → ${entered_destination || "unknown"}. This changes the forecast location, not the flight's recorded route.`;
    warning.classList.remove("hidden");
  } else if (metro) {
    warning.textContent =
      "The flight API returned a metropolitan airport code. Please choose the exact airport below to avoid showing weather for the wrong location.";
    warning.classList.remove("hidden");
  } else {
    warning.classList.add("hidden");
  }
  // The hourly flight-time prediction belongs to the API's recorded airports.
  by_id("flight_time_panel").classList.toggle("hidden", changed);
}
function show_flight_time_card(label, airport, forecast) {
  const card = element("article", "flight_time_card");
  card.append(
    element("span", "tiny", `${label} · ${airport.code || "Unknown"}`),
  );
  card.append(
    element(
      "small",
      "",
      `Forecast hour: ${date_text(forecast?.forecast_time)}`,
    ),
  );
  if (!forecast?.available) {
    card.append(
      element("strong", "", forecast?.message || "Hourly forecast unavailable"),
    );
  } else {
    const temp =
      forecast.temperature != null
        ? `${Math.round(Number(forecast.temperature))}${forecast.temperature_unit || "°F"}`
        : "Temperature unavailable";
    card.append(
      element("strong", "", `${weather_symbol(forecast.weather_code)} ${temp}`),
    );
    card.append(
      element("small", "", weather_description(forecast.weather_code)),
    );
  }
  return card;
}
function show_flight_context(context) {
  selected_flight = context;
  by_id("nav_forecast_link").href = airport_tools.forecast_url(context);
  by_id("flight_context_panel").classList.remove("hidden");
  by_id("forecast_flight_number").textContent =
    context.number || context.requested_id || "Flight";
  by_id("forecast_flight_status").textContent = context.status || "Unknown";
  by_id("forecast_flight_id").textContent = context.unique_id
    ? `Unique flight ID: ${context.unique_id}`
    : `Searched as ${context.requested_id || context.lookup_id || context.number}. A unique flight instance ID was not returned by the Lambda API.`;
  by_id("forecast_flight_date").textContent =
    `Scheduled departure: ${date_text(context.scheduled_departure)}`;
  by_id("forecast_route").textContent =
    `Flight API route: ${context.origin?.code || "Unknown"} → ${context.destination?.code || "Unknown"}`;
  by_id("origin_input").value =
    context.origin?.code || context.origin?.city || "";
  by_id("destination_input").value =
    context.destination?.code || context.destination?.city || "";
  show_airport_choice("origin");
  show_airport_choice("destination");
  const cards = by_id("flight_time_cards");
  cards.replaceChildren(
    show_flight_time_card(
      "DEPARTURE",
      context.origin,
      context.departure_forecast,
    ),
    show_flight_time_card(
      "ARRIVAL",
      context.destination,
      context.arrival_forecast,
    ),
  );
  by_id("flight_time_panel").classList.remove("hidden");
  update_flight_override();
}
async function fetch_flight_by_id(flight_id) {
  const access_token = window.aero_auth?.get_token();
  if (window.AEROTRACK_CONFIG.require_auth && !access_token)
    throw new Error("Sign in before loading a flight forecast.");
  const url = new URL(
    window.AEROTRACK_CONFIG.api_base_url.replace(/\/+$/, "") + "/flight",
  );
  url.searchParams.set("flight_id", flight_id);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
    },
  });
  let data;
  try {
    data = await response.json();
    if (typeof data.body === "string") data = JSON.parse(data.body);
  } catch {
    throw new Error("Flight API returned an invalid response.");
  }
  if (!response.ok || data?.error)
    throw new Error(
      data?.error || `Flight lookup failed (${response.status}).`,
    );
  return data;
}
async function load_flight_context() {
  const flight_id = new URLSearchParams(location.search)
    .get("flight_id")
    ?.trim();
  if (!flight_id) return; // The plain Forecast navigation is always a fresh, manual search.
  by_id("forecast_loading").classList.remove("hidden");
  by_id("forecast_error").classList.add("hidden");
  try {
    let context = airport_tools.read(flight_id);
    if (!context) {
      // A bookmark or a reopened forecast still works if the backend accepts the ID.
      const data = await fetch_flight_by_id(flight_id);
      context = airport_tools.build(data, flight_id);
      airport_tools.store(context);
    }
    show_flight_context(context);
    const has_metro =
      airport_tools.metro_codes[context.origin.code] ||
      airport_tools.metro_codes[context.destination.code];
    if (!has_metro) await load_forecast();
  } catch (error) {
    show_error(
      error.message || "Could not load the selected flight's forecast.",
    );
  } finally {
    by_id("forecast_loading").classList.add("hidden");
  }
}
async function resolve_location(raw_input, existing) {
  const value = String(raw_input || "").trim();
  if (!value)
    throw new Error("Enter both departure and arrival airports or cities.");
  const code = airport_tools.normalize_code(value);
  if (airport_tools.metro_codes[code]) {
    throw new Error(
      `${code} covers multiple airports. Choose the specific airport using the selector below.`,
    );
  }
  const is_same = matching_airport(value, existing);
  const existing_has_coordinates =
    is_same && valid_coordinates(existing.latitude, existing.longitude);
  if (existing_has_coordinates) {
    return {
      code,
      name: existing.name || code,
      latitude: Number(existing.latitude),
      longitude: Number(existing.longitude),
      approximate: false,
      source: existing.coordinate_source || "Flight API",
    };
  }
  const airport = airport_tools.local_airport(code);
  if (airport) return { ...airport, approximate: false };
  let query_text = value;
  if (/^[A-Za-z]{3,4}$/.test(value) && value === value.toUpperCase()) {
    if (is_same && existing.city) query_text = existing.city;
    else
      throw new Error(
        `Airport code ${code} has no coordinates in this website's airport list. Enter a city name, or return to a flight with airport coordinates.`,
      );
  }
  // A city weather result is explicitly labeled as approximate.
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query_text);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Could not look up ${query_text}.`);
  const data = await response.json();
  const city = data.results?.[0];
  if (!city)
    throw new Error(`City not found: ${query_text}. Try its full name.`);
  return {
    code: "",
    name: `${city.name}${city.country ? ", " + city.country : ""}`,
    latitude: city.latitude,
    longitude: city.longitude,
    approximate: true,
    source: "City geocoding",
  };
}
async function fetch_daily(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  Object.entries({
    latitude: place.latitude,
    longitude: place.longitude,
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: forecast_days,
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString());
  if (!response.ok)
    throw new Error("Open Meteo could not retrieve a daily forecast.");
  const data = await response.json();
  if (!Array.isArray(data?.daily?.time) || !data.daily.time.length)
    throw new Error("No daily weather data was returned.");
  return data;
}
function show_place(label, place, data) {
  const section = element("section", "forecast_location");
  const title = element("div", "section_title");
  const heading = element("div");
  heading.append(
    element("span", "eyebrow", label),
    element("h2", "", `${place.code ? place.code + " · " : ""}${place.name}`),
  );
  title.append(heading);
  section.append(title);
  section.append(
    element(
      "p",
      "helper",
      place.approximate
        ? "Approximate city forecast. The weather coordinates are not for a specific airport."
        : "Weather forecast near the selected airport's reference coordinates.",
    ),
  );
  const grid = element("div", "forecast_cards");
  data.daily.time.slice(0, forecast_days).forEach((date, index) => {
    const daily = data.daily;
    const date_label = new Date(`${date}T12:00:00Z`).toLocaleDateString(
      "en-US",
      { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" },
    );
    const card = element("article", "panel daily_card");
    card.append(
      element("span", "tiny", date_label),
      element("div", "daily_icon", weather_symbol(daily.weather_code?.[index])),
      element(
        "strong",
        "daily_temp",
        `${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°`,
      ),
      element(
        "p",
        "daily_desc",
        weather_description(daily.weather_code?.[index]),
      ),
      element(
        "small",
        "",
        `Rain chance ${daily.precipitation_probability_max?.[index] ?? "—"}%`,
      ),
      element(
        "small",
        "",
        `Wind up to ${daily.wind_speed_10m_max?.[index] == null ? "—" : Math.round(daily.wind_speed_10m_max[index])} mph`,
      ),
    );
    grid.append(card);
  });
  section.append(grid);
  return section;
}
async function load_forecast() {
  if (running_search) return;
  const origin = by_id("origin_input").value.trim();
  const destination = by_id("destination_input").value.trim();
  show_airport_choice("origin");
  show_airport_choice("destination");
  update_flight_override();
  if (
    airport_tools.metro_codes[airport_tools.normalize_code(origin)] ||
    airport_tools.metro_codes[airport_tools.normalize_code(destination)]
  ) {
    show_error(
      "A metropolitan code refers to more than one airport. Select a specific airport from the highlighted list, then click Get forecast.",
    );
    return;
  }
  const my_generation = ++search_generation;
  running_search = true;
  by_id("forecast_search").disabled = true;
  by_id("forecast_error").classList.add("hidden");
  by_id("forecast_loading").classList.remove("hidden");
  by_id("forecast_results").replaceChildren();
  try {
    const [place_origin, place_destination] = await Promise.all([
      resolve_location(origin, selected_flight?.origin),
      resolve_location(destination, selected_flight?.destination),
    ]);
    const [origin_data, destination_data] = await Promise.all([
      fetch_daily(place_origin),
      fetch_daily(place_destination),
    ]);
    if (my_generation !== search_generation) return;
    by_id("forecast_results").append(
      show_place("DEPARTURE", place_origin, origin_data),
      show_place("ARRIVAL", place_destination, destination_data),
    );
  } catch (error) {
    show_error(error.message || "Forecast unavailable.");
  } finally {
    running_search = false;
    by_id("forecast_search").disabled = false;
    by_id("forecast_loading").classList.add("hidden");
  }
}
function set_days(value) {
  forecast_days = value;
  by_id("three_days").classList.toggle("active", value === 3);
  by_id("five_days").classList.toggle("active", value === 5);
  if (by_id("forecast_results").children.length && !running_search)
    load_forecast();
}
for (const which of ["origin", "destination"]) {
  by_id(`${which}_input`).addEventListener("input", () => {
    show_airport_choice(which);
    update_flight_override();
  });
  by_id(`${which}_airport_choice`).addEventListener("change", (event) => {
    if (event.target.value) {
      by_id(`${which}_input`).value = event.target.value;
      show_airport_choice(which);
      update_flight_override();
      by_id("forecast_error").classList.add("hidden");
    }
  });
}
by_id("three_days").addEventListener("click", () => set_days(3));
by_id("five_days").addEventListener("click", () => set_days(5));
by_id("forecast_search").addEventListener("click", load_forecast);
window.addEventListener("aero_auth_ready", load_flight_context);
