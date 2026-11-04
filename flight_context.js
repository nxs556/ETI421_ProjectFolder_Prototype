"use strict";
// Shared flight and airport context for the flight details and forecast pages.
// Coordinates are approximate airport reference points, not precise weather-station readings.
(() => {
  const airport_records = {
    JFK: [
      40.6413,
      -73.7781,
      "New York",
      "John F. Kennedy International Airport",
    ],
    LGA: [40.7769, -73.874, "New York", "LaGuardia Airport"],
    EWR: [40.6895, -74.1745, "Newark", "Newark Liberty International Airport"],
    LHR: [51.47, -0.4543, "London", "Heathrow Airport"],
    LGW: [51.1537, -0.1821, "London", "Gatwick Airport"],
    LCY: [51.5053, 0.0553, "London", "London City Airport"],
    STN: [51.885, 0.235, "London", "Stansted Airport"],
    LTN: [51.8747, -0.3683, "London", "Luton Airport"],
    CDG: [49.0097, 2.5479, "Paris", "Charles de Gaulle Airport"],
    ORY: [48.7262, 2.3652, "Paris", "Orly Airport"],
    LAX: [
      33.9416,
      -118.4085,
      "Los Angeles",
      "Los Angeles International Airport",
    ],
    SFO: [
      37.6213,
      -122.379,
      "San Francisco",
      "San Francisco International Airport",
    ],
    OAK: [37.7126, -122.2197, "Oakland", "Oakland International Airport"],
    SJC: [
      37.3639,
      -121.9289,
      "San Jose",
      "San Jose Mineta International Airport",
    ],
    ORD: [41.9742, -87.9073, "Chicago", "O'Hare International Airport"],
    MDW: [41.7868, -87.7522, "Chicago", "Midway International Airport"],
    BOS: [42.3656, -71.0096, "Boston", "Logan International Airport"],
    IAD: [38.9531, -77.4565, "Washington", "Dulles International Airport"],
    DCA: [38.8512, -77.0402, "Washington", "Reagan National Airport"],
    BWI: [
      39.1754,
      -76.6684,
      "Baltimore",
      "Baltimore Washington International Airport",
    ],
    ATL: [
      33.6407,
      -84.4277,
      "Atlanta",
      "Hartsfield Jackson Atlanta International Airport",
    ],
    DFW: [
      32.8998,
      -97.0403,
      "Dallas",
      "Dallas Fort Worth International Airport",
    ],
    DAL: [32.8471, -96.8518, "Dallas", "Dallas Love Field"],
    DEN: [39.8561, -104.6737, "Denver", "Denver International Airport"],
    MIA: [25.7954, -80.2901, "Miami", "Miami International Airport"],
    FLL: [
      26.0742,
      -80.1506,
      "Fort Lauderdale",
      "Fort Lauderdale International Airport",
    ],
    MCO: [28.4312, -81.3081, "Orlando", "Orlando International Airport"],
    SEA: [
      47.4502,
      -122.3088,
      "Seattle",
      "Seattle Tacoma International Airport",
    ],
    PHL: [
      39.8744,
      -75.2424,
      "Philadelphia",
      "Philadelphia International Airport",
    ],
    DTW: [42.2162, -83.3554, "Detroit", "Detroit Metropolitan Airport"],
    CLT: [
      35.2144,
      -80.9473,
      "Charlotte",
      "Charlotte Douglas International Airport",
    ],
    MSP: [
      44.8848,
      -93.2223,
      "Minneapolis",
      "Minneapolis Saint Paul International Airport",
    ],
    PHX: [33.4342, -112.0116, "Phoenix", "Phoenix Sky Harbor Airport"],
    LAS: [36.084, -115.1537, "Las Vegas", "Harry Reid International Airport"],
    IAH: [29.9902, -95.3368, "Houston", "George Bush Intercontinental Airport"],
    HOU: [29.6454, -95.2789, "Houston", "Houston Hobby Airport"],
    SLC: [
      40.7899,
      -111.9791,
      "Salt Lake City",
      "Salt Lake City International Airport",
    ],
    SAN: [32.7338, -117.1933, "San Diego", "San Diego International Airport"],
    PDX: [45.5898, -122.5951, "Portland", "Portland International Airport"],
    RDU: [35.8801, -78.788, "Raleigh", "Raleigh Durham International Airport"],
    BNA: [36.1245, -86.6782, "Nashville", "Nashville International Airport"],
    YYZ: [
      43.6777,
      -79.6248,
      "Toronto",
      "Toronto Pearson International Airport",
    ],
    YTZ: [43.6275, -79.3962, "Toronto", "Billy Bishop Toronto City Airport"],
    YVR: [49.1947, -123.1792, "Vancouver", "Vancouver International Airport"],
    YUL: [
      45.4706,
      -73.7408,
      "Montreal",
      "Montreal Trudeau International Airport",
    ],
    FRA: [50.0379, 8.5622, "Frankfurt", "Frankfurt Airport"],
    AMS: [52.3105, 4.7683, "Amsterdam", "Amsterdam Schiphol Airport"],
    MAD: [40.4983, -3.5676, "Madrid", "Madrid Barajas Airport"],
    BCN: [41.2974, 2.0833, "Barcelona", "Barcelona El Prat Airport"],
    FCO: [41.8003, 12.2389, "Rome", "Rome Fiumicino Airport"],
    MXP: [45.6301, 8.7231, "Milan", "Milan Malpensa Airport"],
    ZRH: [47.4581, 8.5555, "Zurich", "Zurich Airport"],
    MUC: [48.3538, 11.7861, "Munich", "Munich Airport"],
    DUB: [53.4264, -6.2499, "Dublin", "Dublin Airport"],
    LIS: [38.7742, -9.1342, "Lisbon", "Lisbon Airport"],
    BRU: [50.901, 4.4844, "Brussels", "Brussels Airport"],
    DXB: [25.2532, 55.3657, "Dubai", "Dubai International Airport"],
    DOH: [25.2731, 51.6081, "Doha", "Hamad International Airport"],
    SIN: [1.3644, 103.9915, "Singapore", "Changi Airport"],
    HKG: [22.308, 113.9185, "Hong Kong", "Hong Kong International Airport"],
    HND: [35.5494, 139.7798, "Tokyo", "Tokyo Haneda Airport"],
    NRT: [35.772, 140.3929, "Narita", "Narita International Airport"],
    KIX: [34.4273, 135.244, "Osaka", "Kansai International Airport"],
    ICN: [37.4602, 126.4407, "Incheon", "Incheon International Airport"],
    BKK: [13.69, 100.7501, "Bangkok", "Suvarnabhumi Airport"],
    SYD: [-33.9399, 151.1753, "Sydney", "Sydney Kingsford Smith Airport"],
    MEL: [-37.669, 144.841, "Melbourne", "Melbourne Airport"],
    AKL: [-37.0082, 174.785, "Auckland", "Auckland Airport"],
    CUN: [21.0405, -86.874, "Cancun", "Cancun International Airport"],
    MEX: [
      19.4361,
      -99.0719,
      "Mexico City",
      "Mexico City International Airport",
    ],
    GRU: [-23.4356, -46.4731, "Sao Paulo", "Sao Paulo Guarulhos Airport"],
    GIG: [-22.809, -43.2506, "Rio de Janeiro", "Rio Galeao Airport"],
    JNB: [-26.1392, 28.246, "Johannesburg", "OR Tambo International Airport"],
    CPT: [-33.9715, 18.6021, "Cape Town", "Cape Town International Airport"],
    DEL: [28.5562, 77.1, "Delhi", "Indira Gandhi International Airport"],
    BOM: [
      19.0896,
      72.8656,
      "Mumbai",
      "Chhatrapati Shivaji Maharaj International Airport",
    ],
  };
  const metro_codes = {
    NYC: { city: "New York", codes: ["JFK", "LGA", "EWR"] },
    LON: { city: "London", codes: ["LHR", "LGW", "LCY", "STN", "LTN"] },
    PAR: { city: "Paris", codes: ["CDG", "ORY"] },
    CHI: { city: "Chicago", codes: ["ORD", "MDW"] },
    WAS: { city: "Washington", codes: ["IAD", "DCA", "BWI"] },
    TYO: { city: "Tokyo", codes: ["HND", "NRT"] },
    YTO: { city: "Toronto", codes: ["YYZ", "YTZ"] },
  };
  const icao_aliases = {
    EGLL: "LHR",
    EGKK: "LGW",
    EGLC: "LCY",
    EGSS: "STN",
    EGGW: "LTN",
    LFPG: "CDG",
    LFPO: "ORY",
    EDDF: "FRA",
    EHAM: "AMS",
    EDMM: "MUC",
    EDDM: "MUC",
    OMDB: "DXB",
    OTHH: "DOH",
    WSSS: "SIN",
    VHHH: "HKG",
    RJTT: "HND",
    RJAA: "NRT",
    RKSI: "ICN",
    VTBS: "BKK",
    YSSY: "SYD",
    YMML: "MEL",
    CYYZ: "YYZ",
    CYTZ: "YTZ",
    CYVR: "YVR",
    CYUL: "YUL",
  };
  const storage_key = "aero_selected_flight_context_v2";
  const code_text = (value) =>
    typeof value === "string" ? value.trim().toUpperCase() : "";
  const first = (...values) =>
    values.find((v) => v !== undefined && v !== null && v !== "");
  const number_or_null = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const valid_coordinates = (lat, lon) =>
    lat !== null &&
    lon !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0);
  function normalize_code(value) {
    const code = code_text(value);
    if (airport_records[code] || metro_codes[code]) return code;
    if (icao_aliases[code]) return icao_aliases[code];
    if (/^K[A-Z]{3}$/.test(code) && airport_records[code.slice(1)])
      return code.slice(1);
    return code;
  }
  function find_by_name(name) {
    const text = String(name || "").toLowerCase();
    if (!text || text.length < 7) return "";
    const patterns = [
      [/john f\.? kennedy|kennedy international/i, "JFK"],
      [/laguardia/i, "LGA"],
      [/newark liberty/i, "EWR"],
      [/heathrow/i, "LHR"],
      [/gatwick/i, "LGW"],
      [/london city airport/i, "LCY"],
      [/charles de gaulle/i, "CDG"],
    ];
    return patterns.find(([re]) => re.test(text))?.[1] || "";
  }
  function local_airport(code) {
    const normalized = normalize_code(code);
    const record = airport_records[normalized];
    return record
      ? {
          code: normalized,
          latitude: record[0],
          longitude: record[1],
          city: record[2],
          name: record[3],
          source: "local_airport_database",
        }
      : null;
  }
  function normalize_airport(raw, flight_airport) {
    const current = raw && typeof raw === "object" ? raw : { airport: raw };
    const extra =
      flight_airport && typeof flight_airport === "object"
        ? flight_airport
        : { airport: flight_airport };
    const candidates = [
      current.code_iata,
      current.iata,
      current.iata_code,
      extra.code_iata,
      extra.iata,
      extra.iata_code,
      current.code_icao,
      current.icao,
      extra.code_icao,
      extra.icao,
      current.airport,
      current.code,
      extra.airport,
      extra.code,
    ]
      .map(normalize_code)
      .filter(Boolean);
    const inferred = find_by_name(first(current.name, extra.name, ""));
    const code = candidates[0] || inferred;
    // Prefer an explicit, recognized airport code over a metropolitan code (NYC, LON, etc.).
    const precise_code = candidates.find((candidate) =>
      Boolean(airport_records[candidate]),
    );
    const final_code =
      precise_code || (metro_codes[code] && inferred ? inferred : code);
    const local = local_airport(final_code);
    const latitude = number_or_null(
      first(
        current.latitude,
        current.lat,
        current.weather?.latitude,
        current.weather?.coordinates?.latitude,
        extra.latitude,
        extra.lat,
      ),
    );
    const longitude = number_or_null(
      first(
        current.longitude,
        current.lon,
        current.lng,
        current.weather?.longitude,
        current.weather?.coordinates?.longitude,
        extra.longitude,
        extra.lon,
      ),
    );
    const coords_available = valid_coordinates(latitude, longitude);
    const city = String(
      first(
        current.city,
        extra.city,
        local?.city,
        metro_codes[final_code]?.city,
        "",
      ),
    );
    return {
      code: final_code,
      original_code: code,
      name: String(first(current.name, extra.name, local?.name, "")),
      city,
      latitude: metro_codes[final_code]
        ? null
        : coords_available
          ? latitude
          : (local?.latitude ?? null),
      longitude: metro_codes[final_code]
        ? null
        : coords_available
          ? longitude
          : (local?.longitude ?? null),
      coordinate_source: metro_codes[final_code]
        ? "metropolitan_area"
        : coords_available
          ? "backend"
          : local
            ? "local_airport_database"
            : "unknown",
      is_metropolitan: Boolean(metro_codes[final_code]),
    };
  }
  function build(data, requested_id) {
    if (!data?.flight || !data?.departure || !data?.arrival)
      throw new Error("The API returned incomplete flight details.");
    const flight = data.flight;
    const number = String(
      first(flight.number, flight.ident, requested_id, "Unknown flight"),
    );
    const unique_id = String(
      first(
        flight.fa_flight_id,
        flight.faFlightID,
        flight.flightaware_id,
        flight.flight_id,
        flight.id,
        "",
      ),
    ).trim();
    const lookup_id = String(
      first(unique_id, requested_id, flight.ident, flight.number, ""),
    );
    return {
      version: 2,
      number,
      requested_id: String(requested_id || ""),
      unique_id,
      lookup_id,
      status: String(flight.status || "Unknown"),
      scheduled_departure: first(
        flight.scheduled_departure,
        flight.estimated_departure,
        null,
      ),
      estimated_departure: first(flight.estimated_departure, null),
      scheduled_arrival: first(
        flight.scheduled_arrival,
        flight.estimated_arrival,
        null,
      ),
      estimated_arrival: first(flight.estimated_arrival, null),
      origin: normalize_airport(data.departure, flight.origin),
      destination: normalize_airport(data.arrival, flight.destination),
      departure_forecast: data.departure.weather?.forecast || null,
      arrival_forecast: data.arrival.weather?.forecast || null,
      saved_at: Date.now(),
    };
  }
  function store(context) {
    try {
      sessionStorage.setItem(storage_key, JSON.stringify(context));
    } catch (error) {
      console.warn("Flight context storage unavailable", error);
    }
  }
  function read(requested_id) {
    try {
      const context = JSON.parse(sessionStorage.getItem(storage_key) || "null");
      if (!context || context.version !== 2) return null;
      if (!requested_id) return null;
      const requested = String(requested_id).toUpperCase();
      const matches = [
        context.unique_id,
        context.lookup_id,
        context.requested_id,
        context.number,
      ].some((value) => String(value || "").toUpperCase() === requested);
      return matches ? context : null;
    } catch {
      return null;
    }
  }
  function forecast_url(context) {
    return `forecast.html?flight_id=${encodeURIComponent(context.unique_id || context.lookup_id || context.number)}`;
  }
  window.aero_flight_context = {
    build,
    store,
    read,
    forecast_url,
    normalize_airport,
    normalize_code,
    local_airport,
    metro_codes,
    airport_records,
  };
})();
