"use strict";
const by_id = (id) => document.getElementById(id);
let days = 5;
let airport_context = null;
const description = (code) =>
  ({
    0: "Clear sky",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    95: "Thunderstorms",
    96: "Thunderstorms with hail",
    99: "Severe thunderstorms",
  })[code] || "Variable conditions";
const symbol = (code) =>
  code >= 95
    ? "⛈️"
    : code >= 71 && code <= 86
      ? "❄️"
      : code >= 51 && code <= 82
        ? "🌧️"
        : code >= 45 && code <= 48
          ? "🌫️"
          : code === 0
            ? "☀️"
            : "⛅";
const safe_text = (element, text) => {
  element.textContent = String(text ?? "—");
  return element;
};
function node(tag, class_name, text) {
  const item = document.createElement(tag);
  if (class_name) item.className = class_name;
  if (text != null) item.textContent = text;
  return item;
}
function set_error(message) {
  by_id("forecast_error").textContent = message;
  by_id("forecast_error").classList.remove("hidden");
}
async function resolve_location(input, previous) {
  const value = input.trim();
  if (!value) throw new Error("Enter both airport or city names.");
  if (
    previous &&
    value.toUpperCase() ===
      String(previous.code || previous.city || "").toUpperCase() &&
    Number.isFinite(Number(previous.latitude)) &&
    Number.isFinite(Number(previous.longitude)) &&
    previous.latitude != null &&
    previous.longitude != null
  )
    return {
      name: previous.code || previous.city,
      latitude: Number(previous.latitude),
      longitude: Number(previous.longitude),
      approximate: false,
    };
  // The Open Meteo geocoding API looks up cities, not airport IATA/ICAO codes.
  const term =
    previous &&
    value.toUpperCase() === String(previous.code || "").toUpperCase()
      ? previous.city || previous.name || value
      : value;
  if (/^[A-Z]{3,4}$/.test(value.toUpperCase()) && term === value)
    throw new Error(
      `No location coordinates are available for ${value}. Enter its city instead, or return to flight details to load airport information.`,
    );
  const query = new URL("https://geocoding-api.open-meteo.com/v1/search");
  query.searchParams.set("name", term);
  query.searchParams.set("count", "1");
  query.searchParams.set("language", "en");
  const response = await fetch(query);
  if (!response.ok) throw new Error("Could not look up location " + term);
  const data = await response.json();
  const found = data.results?.[0];
  if (!found)
    throw new Error(`City not found: ${term}. Try the airport city name.`);
  return {
    name: `${found.name}${found.country ? ", " + found.country : ""}`,
    latitude: found.latitude,
    longitude: found.longitude,
    approximate: true,
  };
}
async function fetch_daily(place) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  Object.entries({
    latitude: place.latitude,
    longitude: place.longitude,
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: days,
  }).forEach(([key, value]) => u.searchParams.set(key, value));
  const response = await fetch(u);
  if (!response.ok)
    throw new Error("Weather provider could not return a forecast.");
  return response.json();
}
function render_place(label, place, data) {
  const section = node("section", "forecast_location");
  const title = node("div", "section_title");
  const heading = node("div");
  heading.append(node("span", "eyebrow", label), node("h2", "", place.name));
  title.append(heading);
  section.append(title);
  if (place.approximate)
    section.append(
      node(
        "p",
        "helper",
        "Approximate city-area weather, not exact airport conditions.",
      ),
    );
  const grid = node("div", "forecast_cards");
  const daily = data.daily;
  if (!daily?.time?.length)
    throw new Error("No daily weather data was returned.");
  daily.time.slice(0, days).forEach((date, index) => {
    const card = node("article", "panel daily_card");
    const date_label = new Date(date + "T12:00:00Z").toLocaleDateString(
      "en-US",
      { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" },
    );
    card.append(
      node("span", "tiny", date_label),
      node("div", "daily_icon", symbol(daily.weather_code[index])),
      node(
        "strong",
        "daily_temp",
        `${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°`,
      ),
      node("p", "daily_desc", description(daily.weather_code[index])),
      node(
        "small",
        "",
        `Rain chance ${daily.precipitation_probability_max[index] ?? "—"}%`,
      ),
      node(
        "small",
        "",
        `Wind up to ${Math.round(daily.wind_speed_10m_max[index])} mph`,
      ),
    );
    grid.append(card);
  });
  section.append(grid);
  return section;
}
async function load_forecast() {
  const first = by_id("origin_input").value;
  const second = by_id("destination_input").value;
  by_id("forecast_error").classList.add("hidden");
  by_id("forecast_loading").classList.remove("hidden");
  by_id("forecast_results").replaceChildren();
  try {
    const a = await resolve_location(first, airport_context?.origin);
    const b = await resolve_location(second, airport_context?.destination);
    const [one, two] = await Promise.all([fetch_daily(a), fetch_daily(b)]);
    by_id("forecast_results").append(
      render_place("DEPARTURE", a, one),
      render_place("ARRIVAL", b, two),
    );
  } catch (error) {
    set_error(error.message || "Forecast unavailable.");
  } finally {
    by_id("forecast_loading").classList.add("hidden");
  }
}
function set_days(value) {
  days = value;
  by_id("three_days").classList.toggle("active", days === 3);
  by_id("five_days").classList.toggle("active", days === 5);
  if (by_id("origin_input").value && by_id("destination_input").value)
    load_forecast();
}
by_id("three_days").addEventListener("click", () => set_days(3));
by_id("five_days").addEventListener("click", () => set_days(5));
by_id("forecast_search").addEventListener("click", load_forecast);
window.addEventListener("aero_auth_ready", () => {
  try {
    airport_context = JSON.parse(
      sessionStorage.getItem("aero_airports") || "null",
    );
  } catch {}
  if (airport_context) {
    by_id("origin_input").value =
      airport_context.origin?.code || airport_context.origin?.city || "";
    by_id("destination_input").value =
      airport_context.destination?.code ||
      airport_context.destination?.city ||
      "";
    load_forecast();
  }
});
