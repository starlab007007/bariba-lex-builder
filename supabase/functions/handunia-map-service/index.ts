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
      osm_id: p.osm_id ?? null,
      osm_type: clean(p.osm_type),
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
        .map((feature: any) => {
          const coords = feature?.geometry?.coordinates;
          const lon = asNumber(coords?.[0]);
          const lat = asNumber(coords?.[1]);
          if (lon == null || lat == null || !inBenin(lon, lat)) return null;
          const p = feature?.properties ?? {};
          return {
            name: clean(p.name) || featureName(feature) || query,
            display_name: featureName(feature) || clean(p.name) || query,
            latitude: lat,
            longitude: lon,
            type: clean(p.type || p.osm_value),
            city: clean(p.city),
            district: clean(p.district),
            state: clean(p.state),
            country: clean(p.country) || "Bénin",
            osm_id: p.osm_id ?? null,
            osm_type: clean(p.osm_type),
          };
        })
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
          ? {
              name: clean(feature?.properties?.name) || featureName(feature),
              display_name: featureName(feature),
              latitude: lat,
              longitude: lon,
              type: clean(feature?.properties?.type || feature?.properties?.osm_value),
            }
          : {
              name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              latitude: lat,
              longitude: lon,
              type: "coordinate",
            },
      });
    }

    if (action === "route") {
      const fromLat = asNumber(body?.from_latitude);
      const fromLon = asNumber(body?.from_longitude);
      const toLat = asNumber(body?.to_latitude);
      const toLon = asNumber(body?.to_longitude);
      if (
        fromLat == null ||
        fromLon == null ||
        toLat == null ||
        toLon == null ||
        !inBenin(fromLon, fromLat) ||
        !inBenin(toLon, toLat)
      ) {
        return jsonResponse({ error: "route_coordinates_invalid" }, 400);
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
