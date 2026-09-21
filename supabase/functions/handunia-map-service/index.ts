import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BENIN = {
  minLon: 0.70,
  minLat: 6.10,
  maxLon: 3.95,
  maxLat: 12.55,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inBenin(lon: number, lat: number) {
  return (
    lon >= BENIN.minLon &&
    lon <= BENIN.maxLon &&
    lat >= BENIN.minLat &&
    lat <= BENIN.maxLat
  );
}

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function featureName(feature: any): string {
  const p = feature?.properties ?? {};
  const parts = [
    p.name,
    p.locality,
    p.district,
    p.city,
    p.county,
    p.state,
  ]
    .map(clean)
    .filter(Boolean);
  return [...new Set(parts)].slice(0, 4).join(" · ");
}

function hierarchyFromProperties(p: any) {
  const department = clean(p?.state);
  const commune = clean(p?.county) || clean(p?.city);
  const arrondissement = clean(p?.district);
  const locality = clean(p?.locality);
  const name = clean(p?.name);
  const rawType = clean(p?.type || p?.osm_value).toLowerCase();
  const villageQuartier =
    locality ||
    (["village", "hamlet", "suburb", "neighbourhood", "quarter"].includes(rawType)
      ? name
      : "");

  return {
    department,
    commune,
    arrondissement,
    village_quartier: villageQuartier,
  };
}

function normalizedFeature(
  feature: any,
  latitudeOverride?: number,
  longitudeOverride?: number,
) {
  const p = feature?.properties ?? {};
  const coords = feature?.geometry?.coordinates;
  const lon = longitudeOverride ?? asNumber(coords?.[0]);
  const lat = latitudeOverride ?? asNumber(coords?.[1]);
  if (lon == null || lat == null || !inBenin(lon, lat)) return null;

  const name =
    clean(p.name) ||
    clean(p.locality) ||
    clean(p.district) ||
    clean(p.city) ||
    clean(p.county) ||
    clean(p.state);
  const displayName = featureName(feature) || name;
  const extent = Array.isArray(feature?.properties?.extent)
    ? feature.properties.extent
    : Array.isArray(feature?.bbox)
      ? feature.bbox
      : null;

  return {
    name: name || displayName || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    display_name:
      displayName || name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    latitude: lat,
    longitude: lon,
    type: clean(p.type || p.osm_value),
    city: clean(p.city),
    district: clean(p.district),
    state: clean(p.state),
    county: clean(p.county),
    locality: clean(p.locality),
    country: clean(p.country) || "Bénin",
    osm_id: p.osm_id == null ? null : String(p.osm_id),
    osm_type: clean(p.osm_type),
    geo_provider: "photon-osm",
    ...hierarchyFromProperties(p),
    extent,
  };
}

async function fetchJson(url: string, timeoutMs = 16000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "FITILA-Handunia/1.8.1 (heritage map; Benin)",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function reverseRoutePlace(lat: number, lon: number) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    lang: "fr",
    limit: "1",
  });
  try {
    const data = await fetchJson(`https://photon.komoot.io/reverse?${params}`, 9000);
    const feature = Array.isArray(data?.features) ? data.features[0] : null;
    if (!feature) return null;
    const p = feature?.properties ?? {};
    const name =
      clean(p.name) ||
      clean(p.locality) ||
      clean(p.district) ||
      clean(p.city) ||
      clean(p.county) ||
      clean(p.state);
    const displayName = featureName(feature) || name;
    if (!displayName) return null;
    return {
      name: name || displayName,
      display_name: displayName,
      latitude: lat,
      longitude: lon,
      type: clean(p.type || p.osm_value),
      city: clean(p.city),
      district: clean(p.district),
      state: clean(p.state),
      county: clean(p.county),
      locality: clean(p.locality),
      country: clean(p.country) || "Bénin",
      osm_id: p.osm_id == null ? null : String(p.osm_id),
      osm_type: clean(p.osm_type),
      geo_provider: "photon-osm",
      ...hierarchyFromProperties(p),
    };
  } catch {
    return null;
  }
}

async function routePlaces(points: Array<{ latitude: number; longitude: number }>) {
  if (points.length < 2) return [];
  const indexes = [
    0,
    Math.round((points.length - 1) * 0.25),
    Math.round((points.length - 1) * 0.5),
    Math.round((points.length - 1) * 0.75),
    points.length - 1,
  ];
  const uniqueIndexes = [...new Set(indexes)];
  const places: any[] = [];
  const seen = new Set<string>();
  for (const index of uniqueIndexes) {
    const point = points[index];
    if (!point) continue;
    const place = await reverseRoutePlace(point.latitude, point.longitude);
    if (!place) continue;
    const key = clean(place.display_name).toLocaleLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places;
}


function decodePolyline6(encoded: string) {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const deltaLon = (result & 1) ? ~(result >> 1) : result >> 1;
    lon += deltaLon;

    points.push({
      latitude: lat / 1e6,
      longitude: lon / 1e6,
    });
  }
  return points;
}

async function fetchValhallaRoute(args: {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  requestedMode: string;
}) {
  const costing =
    args.requestedMode === "bicycle"
      ? "bicycle"
      : args.requestedMode === "walking" || args.requestedMode === "horse"
        ? "pedestrian"
        : "auto";
  const baseUrl =
    (Deno.env.get("VALHALLA_BASE_URL") ?? "https://valhalla1.openstreetmap.de")
      .replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(`${baseUrl}/route`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Client-Id": "fitila.bj-handunia",
        "User-Agent": "FITILA-Handunia/1.8.3 (heritage guide; Benin)",
      },
      body: JSON.stringify({
        locations: [
          { lat: args.fromLat, lon: args.fromLon, type: "break" },
          { lat: args.toLat, lon: args.toLon, type: "break" },
        ],
        costing,
        shape_format: "polyline6",
        directions_options: {
          units: "kilometers",
          language: "fr-FR",
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Valhalla HTTP ${response.status}`);
    }
    const data = await response.json();
    const legs = Array.isArray(data?.trip?.legs) ? data.trip.legs : [];
    if (!legs.length) throw new Error("Valhalla route vide");

    const points: Array<{ latitude: number; longitude: number }> = [];
    const steps: any[] = [];
    for (const leg of legs) {
      const legPoints = decodePolyline6(clean(leg?.shape));
      for (const point of legPoints) {
        const previous = points[points.length - 1];
        if (
          previous &&
          Math.abs(previous.latitude - point.latitude) < 1e-8 &&
          Math.abs(previous.longitude - point.longitude) < 1e-8
        ) {
          continue;
        }
        points.push(point);
      }
      for (const maneuver of Array.isArray(leg?.maneuvers) ? leg.maneuvers : []) {
        steps.push({
          name: clean(maneuver?.street_names?.[0]),
          distance_m: (asNumber(maneuver?.length) ?? 0) * 1000,
          duration_s: asNumber(maneuver?.time) ?? 0,
          instruction: clean(maneuver?.instruction),
          verbal_instruction:
            clean(maneuver?.verbal_pre_transition_instruction) ||
            clean(maneuver?.verbal_transition_alert_instruction),
        });
      }
    }
    if (points.length < 2) throw new Error("Valhalla géométrie vide");

    const distanceM = (asNumber(data?.trip?.summary?.length) ?? 0) * 1000;
    const durationS = asNumber(data?.trip?.summary?.time) ?? 0;
    const places = await routePlaces(points);
    const horse = args.requestedMode === "horse";

    return {
      provider: "valhalla-osm",
      route: {
        distance_m: distanceM,
        duration_s: durationS,
        points,
        steps,
        places,
        travel_mode: args.requestedMode,
        route_profile: horse ? "pedestrian-heritage-proxy" : costing,
        duration_is_estimate: horse,
        warning: horse
          ? "Parcours cheval indicatif calculé sur le réseau piéton OSM. Vérifier localement l’accessibilité, l’état des pistes et les autorisations avant départ."
          : "",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !authorization) {
    return jsonResponse({ error: "auth_required" }, 401);
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: "auth_required" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const action = clean(body?.action).toLowerCase();

  try {
    if (action === "search") {
      const query = clean(body?.query);
      if (query.length < 2) {
        return jsonResponse({ error: "query_too_short" }, 400);
      }
      const params = new URLSearchParams({
        q: query,
        limit: "10",
        lang: "fr",
        bbox: `${BENIN.minLon},${BENIN.minLat},${BENIN.maxLon},${BENIN.maxLat}`,
      });
      const data = await fetchJson(`https://photon.komoot.io/api/?${params}`);
      const features = Array.isArray(data?.features) ? data.features : [];
      const results = features
        .map((feature: any) => normalizedFeature(feature))
        .filter(Boolean)
        .slice(0, 8);
      return jsonResponse({
        state: "ready",
        provider: "photon-osm",
        results,
      });
    }

    if (action === "reverse") {
      const lat = asNumber(body?.latitude);
      const lon = asNumber(body?.longitude);
      if (lat == null || lon == null || !inBenin(lon, lat)) {
        return jsonResponse({ error: "coordinate_outside_benin" }, 400);
      }
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        lang: "fr",
        limit: "1",
      });
      const data = await fetchJson(`https://photon.komoot.io/reverse?${params}`);
      const feature = Array.isArray(data?.features) ? data.features[0] : null;
      return jsonResponse({
        state: "ready",
        provider: "photon-osm",
        place: feature
          ? normalizedFeature(feature, lat, lon)
          : {
              name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              latitude: lat,
              longitude: lon,
              type: "coordinate",
              country: "Bénin",
              department: "",
              commune: "",
              arrondissement: "",
              village_quartier: "",
              osm_id: null,
              osm_type: "",
              geo_provider: "coordinate",
            },
      });
    }

    if (action === "route") {
      const fromLat = asNumber(body?.from_latitude);
      const fromLon = asNumber(body?.from_longitude);
      const toLat = asNumber(body?.to_latitude);
      const toLon = asNumber(body?.to_longitude);
      const requestedMode = clean(body?.mode || "auto").toLowerCase();
      const allowedModes = new Set(["auto", "walking", "bicycle", "horse"]);
      if (
        fromLat == null ||
        fromLon == null ||
        toLat == null ||
        toLon == null ||
        !inBenin(fromLon, fromLat) ||
        !inBenin(toLon, toLat) ||
        !allowedModes.has(requestedMode)
      ) {
        return jsonResponse({ error: "route_coordinates_or_mode_invalid" }, 400);
      }

      try {
        const routed = await fetchValhallaRoute({
          fromLat,
          fromLon,
          toLat,
          toLon,
          requestedMode,
        });
        return jsonResponse({
          state: "ready",
          provider: routed.provider,
          route: routed.route,
        });
      } catch (valhallaError) {
        // Le service public Valhalla reste remplaçable via VALHALLA_BASE_URL.
        // Pour l'automobile uniquement, on conserve OSRM comme repli afin
        // d'éviter une régression du lot 2.
        if (requestedMode !== "auto") {
          return jsonResponse(
            {
              state: "unavailable",
              message:
                requestedMode === "horse"
                  ? "Parcours patrimonial indisponible. Le mode cheval reste indicatif et doit être confirmé localement."
                  : "Itinéraire momentanément indisponible.",
              detail:
                valhallaError instanceof Error
                  ? valhallaError.message
                  : "valhalla_error",
            },
            503,
          );
        }
      }

      const coords = `${fromLon},${fromLat};${toLon},${toLat}`;
      const params = new URLSearchParams({
        overview: "full",
        geometries: "geojson",
        steps: "true",
        alternatives: "false",
        annotations: "false",
      });
      const data = await fetchJson(
        `https://router.project-osrm.org/route/v1/driving/${coords}?${params}`,
        22000,
      );
      if (data?.code !== "Ok" || !Array.isArray(data?.routes) || !data.routes.length) {
        return jsonResponse({ state: "no_route", message: "Aucune route carrossable trouvée." }, 404);
      }
      const route = data.routes[0];
      const coordinates = Array.isArray(route?.geometry?.coordinates)
        ? route.geometry.coordinates
            .map((pair: unknown[]) => {
              const lon = asNumber(pair?.[0]);
              const lat = asNumber(pair?.[1]);
              return lon == null || lat == null
                ? null
                : { latitude: lat, longitude: lon };
            })
            .filter(Boolean)
        : [];

      const steps = Array.isArray(route?.legs)
        ? route.legs.flatMap((leg: any) =>
            Array.isArray(leg?.steps)
              ? leg.steps.map((step: any) => ({
                  name: clean(step?.name),
                  distance_m: asNumber(step?.distance) ?? 0,
                  duration_s: asNumber(step?.duration) ?? 0,
                  instruction: clean(step?.maneuver?.type),
                }))
              : []
          )
        : [];

      const places = await routePlaces(
        coordinates as Array<{ latitude: number; longitude: number }>,
      );

      return jsonResponse({
        state: "ready",
        provider: "osrm-osm",
        route: {
          distance_m: asNumber(route?.distance) ?? 0,
          duration_s: asNumber(route?.duration) ?? 0,
          points: coordinates,
          steps,
          places,
          travel_mode: "auto",
          route_profile: "driving",
          duration_is_estimate: false,
          warning: "",
        },
      });
    }

    return jsonResponse({ error: "unknown_action" }, 400);
  } catch (error) {
    return jsonResponse(
      {
        state: "unavailable",
        message: "Service cartographique momentanément indisponible.",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      503,
    );
  }
});
