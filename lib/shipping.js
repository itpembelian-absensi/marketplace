const crypto = require("crypto");

const DEFAULT_SHIPPING_SETTINGS = {
  originName: "",
  originLat: -6.2088,
  originLng: 106.8456,
  originAddress: "",
  storeDelivery: {
    enabled: true,
    label: "Kirim mobil toko",
    flatFee: 50000,
    perKmRate: 0,
    freeAboveSubtotal: 0,
    note: "Diantar oleh kurir internal toko",
  },
  lalamove: {
    enabled: true,
    serviceType: "MOTORCYCLE",
    sandbox: true,
  },
  gosend: {
    enabled: true,
    shipmentMethod: "Instant",
  },
  fallback: {
    perKmRate: 3500,
    minFee: 15000,
    maxFee: 250000,
    lalamoveMultiplier: 1.15,
    gosendMultiplier: 1.1,
  },
};

function mergeShippingSettings(stored) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SHIPPING_SETTINGS));
  if (!stored || typeof stored !== "object") return base;
  return {
    ...base,
    ...stored,
    storeDelivery: { ...base.storeDelivery, ...(stored.storeDelivery || {}) },
    lalamove: { ...base.lalamove, ...(stored.lalamove || {}) },
    gosend: { ...base.gosend, ...(stored.gosend || {}) },
    fallback: { ...base.fallback, ...(stored.fallback || {}) },
  };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundFee(amount) {
  return Math.max(0, Math.round(Number(amount) || 0));
}

function fallbackFee(distanceKm, settings, multiplier = 1) {
  const fb = settings.fallback || DEFAULT_SHIPPING_SETTINGS.fallback;
  const raw = distanceKm * (fb.perKmRate || 3500) * multiplier;
  const fee = roundFee(Math.max(fb.minFee || 15000, Math.min(fb.maxFee || 250000, raw)));
  return { fee, distanceKm: Math.round(distanceKm * 10) / 10 };
}

async function geocodeAddress(address) {
  const q = String(address || "").trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PT-SJS-Marketplace/1.0 (shipping-quote)" },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  const hit = rows[0];
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    displayName: hit.display_name || q,
  };
}

function resolveDestination({ address, destLat, destLng }) {
  const lat = Number(destLat);
  const lng = Number(destLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return Promise.resolve({ lat, lng, displayName: String(address || "").trim() });
  }
  return geocodeAddress(address);
}

function isLalamoveSandbox(apiKey) {
  const envFlag = String(process.env.LALAMOVE_SANDBOX || "").toLowerCase();
  if (envFlag === "false" || envFlag === "0") return false;
  if (envFlag === "true" || envFlag === "1") return true;
  return apiKey.includes("_test") || apiKey.startsWith("pk_test");
}

function getLalamoveCredentials() {
  return {
    apiKey: String(process.env.LALAMOVE_API_KEY || "").trim(),
    apiSecret: String(process.env.LALAMOVE_API_SECRET || "").trim(),
    market: process.env.LALAMOVE_MARKET || "ID",
  };
}

function getGoSendCredentials() {
  return {
    baseUrl: String(process.env.GOSEND_API_BASE || "").trim().replace(/\/$/, ""),
    clientId: String(process.env.GOSEND_CLIENT_ID || "").trim(),
    passKey: String(process.env.GOSEND_PASS_KEY || "").trim(),
    estimatePath:
      process.env.GOSEND_ESTIMATE_PATH || "/gokilat/v10/calculate/price?paymentType=3",
  };
}

function getShippingProviderStatus() {
  const lalamove = getLalamoveCredentials();
  const gosend = getGoSendCredentials();
  return {
    lalamove: {
      configured: Boolean(lalamove.apiKey && lalamove.apiSecret),
      sandbox: lalamove.apiKey ? isLalamoveSandbox(lalamove.apiKey) : null,
      market: lalamove.market,
      keyPreview: lalamove.apiKey ? `${lalamove.apiKey.slice(0, 8)}...` : "",
    },
    gosend: {
      configured: Boolean(gosend.baseUrl && gosend.clientId && gosend.passKey),
      baseUrl: gosend.baseUrl || "",
      clientPreview: gosend.clientId ? `${gosend.clientId.slice(0, 6)}...` : "",
    },
  };
}

function parseGoSendFee(json, methodKey = "Instant") {
  const wanted = String(methodKey || "Instant").toLowerCase();
  const instant = json.Instant || json.instant || json.data?.Instant;
  const sameDay = json.SameDay || json.sameDay || json.data?.SameDay;
  const instantCar = json.InstantCar || json.instantCar || json.data?.InstantCar;

  const candidates = [
    wanted.includes("same") ? sameDay : null,
    wanted.includes("car") ? instantCar : null,
    instant,
    sameDay,
    instantCar,
    json,
  ].filter(Boolean);

  for (const block of candidates) {
    const priceBlock = block?.price || block;
    const fee = roundFee(
      priceBlock?.total_price ||
        priceBlock?.totalPrice ||
        priceBlock?.go_pay_total_price ||
        priceBlock?.price ||
        block?.total_price
    );
    if (fee) {
      return {
        fee,
        label: block?.shipment_method || block?.shipmentMethod || methodKey,
      };
    }
  }
  return null;
}

function lalamoveBaseUrl(sandbox) {
  return sandbox ? "https://rest.sandbox.lalamove.com" : "https://rest.lalamove.com";
}

function buildLalamoveAuth(method, path, bodyString, apiKey, apiSecret) {
  const timestamp = Date.now().toString();
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${bodyString}`;
  const signature = crypto.createHmac("sha256", apiSecret).update(raw).digest("hex");
  return {
    timestamp,
    authorization: `hmac ${apiKey}:${timestamp}:${signature}`,
  };
}

async function quoteLalamove({ settings, origin, destination, address }) {
  const { apiKey, apiSecret, market } = getLalamoveCredentials();
  const sandbox = isLalamoveSandbox(apiKey);
  const serviceType = settings.lalamove?.serviceType || "MOTORCYCLE";
  const path = "/v3/quotations";
  const originAddress = settings.originAddress || "Toko";
  const destAddress = String(address || destination.displayName || "Tujuan").trim();

  const payload = {
    data: {
      serviceType,
      language: "id_ID",
      stops: [
        {
          coordinates: { lat: String(origin.lat), lng: String(origin.lng) },
          address: originAddress,
        },
        {
          coordinates: { lat: String(destination.lat), lng: String(destination.lng) },
          address: destAddress,
        },
      ],
    },
  };
  const bodyString = JSON.stringify(payload);

  if (!apiKey || !apiSecret) {
    const distanceKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
    const mult = settings.fallback?.lalamoveMultiplier || 1.15;
    const { fee, distanceKm: km } = fallbackFee(distanceKm, settings, mult);
    return {
      fee,
      distanceKm: km,
      source: "fallback",
      estimated: true,
      label: "Lalamove (estimasi)",
      note: "Estimasi berdasarkan jarak. Hubungkan API Lalamove di .env untuk tarif resmi.",
      provider: "lalamove",
    };
  }

  const { authorization } = buildLalamoveAuth("POST", path, bodyString, apiKey, apiSecret);
  const res = await fetch(`${lalamoveBaseUrl(sandbox)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      Market: market,
      "Request-ID": `sjs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    },
    body: bodyString,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || `Lalamove API error (${res.status})`;
    throw new Error(msg);
  }
  const data = json.data || json;
  const price =
    data.priceBreakdown?.total ||
    data.price?.total ||
    data.totalFee ||
    data.fee;
  const fee = roundFee(price);
  if (!fee) {
    throw new Error("Lalamove tidak mengembalikan harga ongkir.");
  }
  return {
    fee,
    distanceKm: null,
    source: "lalamove_api",
    estimated: false,
    label: `Lalamove (${serviceType})`,
    note: data.quotationId ? `Quotation: ${data.quotationId}` : "",
    provider: "lalamove",
    quotationId: data.quotationId || data.id || "",
    currency: data.currency || "IDR",
  };
}

async function quoteGoSend({ settings, origin, destination }) {
  const { baseUrl, clientId, passKey, estimatePath } = getGoSendCredentials();
  const originLatLong = `${origin.lat},${origin.lng}`;
  const destLatLong = `${destination.lat},${destination.lng}`;
  const methodKey = settings.gosend?.shipmentMethod || "Instant";

  if (!baseUrl || !clientId || !passKey) {
    const distanceKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
    const mult = settings.fallback?.gosendMultiplier || 1.1;
    const { fee, distanceKm: km } = fallbackFee(distanceKm, settings, mult);
    return {
      fee,
      distanceKm: km,
      source: "fallback",
      estimated: true,
      label: `GoSend ${methodKey} (estimasi)`,
      note: "Estimasi berdasarkan jarak. Daftar mitra GoSend API untuk tarif resmi.",
      provider: "gosend",
    };
  }

  const url = `${baseUrl}${estimatePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-ID": clientId,
      "Pass-Key": passKey,
    },
    body: JSON.stringify({
      origin: originLatLong,
      destination: destLatLong,
      paymentType: 3,
    }),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const errMsg =
      json?.errors?.[0]?.message ||
      json?.message ||
      json?.error_message ||
      text ||
      `GoSend API error (${res.status})`;
    throw new Error(errMsg);
  }

  const parsed = parseGoSendFee(json, methodKey);
  if (!parsed?.fee) {
    throw new Error("GoSend tidak mengembalikan harga ongkir.");
  }
  return {
    fee: parsed.fee,
    distanceKm: Number(json.distance || json.data?.distance) || null,
    source: "gosend_api",
    estimated: false,
    label: `GoSend ${parsed.label || methodKey}`,
    note: "",
    provider: "gosend",
  };
}

function quoteStore({ settings, productsSubtotal, origin, destination }) {
  const cfg = settings.storeDelivery || {};
  const minFee = roundFee(cfg.flatFee ?? 50000);
  const perKmRate = Number(cfg.perKmRate) || 0;
  const freeAbove = Number(cfg.freeAboveSubtotal) || 0;
  const subtotal = Number(productsSubtotal) || 0;
  const distanceKm =
    origin && destination
      ? Math.round(haversineKm(origin.lat, origin.lng, destination.lat, destination.lng) * 10) / 10
      : null;

  if (freeAbove > 0 && subtotal >= freeAbove) {
    return {
      fee: 0,
      distanceKm,
      source: "admin_free",
      estimated: false,
      label: cfg.label || "Kirim mobil toko",
      note: "Gratis ongkir (subtotal memenuhi syarat)",
      provider: "store",
    };
  }

  if (perKmRate > 0) {
    if (!origin || !destination || distanceKm == null) {
      throw new Error("Alamat atau GPS tujuan diperlukan untuk hitung ongkir per kilometer.");
    }
    const billedKm = Math.max(1, distanceKm);
    const fee = roundFee(Math.max(minFee, billedKm * perKmRate));
    return {
      fee,
      distanceKm: billedKm,
      source: "store_per_km",
      estimated: true,
      label: cfg.label || "Kirim mobil toko",
      note: `${billedKm} km × Rp ${perKmRate.toLocaleString("id-ID")}/km${minFee ? ` (min Rp ${minFee.toLocaleString("id-ID")})` : ""}`,
      provider: "store",
    };
  }

  return {
    fee: minFee,
    distanceKm,
    source: "admin_flat",
    estimated: false,
    label: cfg.label || "Kirim mobil toko",
    note: cfg.note || "",
    provider: "store",
  };
}

function getShippingOptions(settings) {
  const s = mergeShippingSettings(settings);
  const options = [];
  if (s.storeDelivery?.enabled !== false) {
    const perKmRate = Number(s.storeDelivery?.perKmRate) || 0;
    options.push({
      id: "store",
      label: s.storeDelivery?.label || "Kirim mobil toko",
      description:
        perKmRate > 0
          ? `Dihitung dari jarak gudang × Rp ${perKmRate.toLocaleString("id-ID")}/km`
          : s.storeDelivery?.note || "Diantar kurir toko",
      requiresQuote: true,
      distanceBased: perKmRate > 0,
    });
  }
  if (s.lalamove?.enabled !== false) {
    options.push({
      id: "lalamove",
      label: "Lalamove",
      description: "Estimasi tarif dari Lalamove (motor/mobil sesuai pengaturan)",
      requiresQuote: true,
    });
  }
  if (s.gosend?.enabled !== false) {
    options.push({
      id: "gosend",
      label: "GoSend",
      description: "Estimasi tarif dari GoSend Instant",
      requiresQuote: true,
    });
  }
  return options;
}

async function calculateShippingQuote({
  method,
  address,
  destLat,
  destLng,
  productsSubtotal,
  settings,
}) {
  const merged = mergeShippingSettings(settings);
  const origin = {
    lat: Number(merged.originLat),
    lng: Number(merged.originLng),
  };
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    throw new Error("Koordinat asal toko belum diatur di admin.");
  }

  if (method === "store") {
    const perKmRate = Number(merged.storeDelivery?.perKmRate) || 0;
    if (perKmRate > 0) {
      const destination = await resolveDestination({ address, destLat, destLng });
      if (!destination) {
        throw new Error(
          "Alamat tidak ditemukan di peta. Perjelas alamat atau gunakan tombol GPS untuk koordinat."
        );
      }
      return quoteStore({
        settings: merged,
        productsSubtotal,
        origin,
        destination,
      });
    }
    return quoteStore({ settings: merged, productsSubtotal });
  }

  const destination = await resolveDestination({ address, destLat, destLng });
  if (!destination) {
    throw new Error(
      "Alamat tidak ditemukan di peta. Perjelas alamat atau gunakan tombol GPS untuk koordinat."
    );
  }

  if (method === "lalamove") {
    return quoteLalamove({ settings: merged, origin, destination, address });
  }
  if (method === "gosend") {
    return quoteGoSend({ settings: merged, origin, destination });
  }
  throw new Error("Metode pengiriman tidak dikenal.");
}

function sampleTestDestination(origin) {
  return {
    lat: origin.lat + 0.02,
    lng: origin.lng + 0.02,
    displayName: "Titik uji coba (±2 km dari gudang)",
  };
}

async function testShippingProvider(provider, settings) {
  const merged = mergeShippingSettings(settings);
  const origin = {
    lat: Number(merged.originLat),
    lng: Number(merged.originLng),
  };
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    throw new Error("Isi koordinat gudang dulu sebelum uji API.");
  }

  const destination = sampleTestDestination(origin);
  const status = getShippingProviderStatus();

  if (provider === "lalamove") {
    if (!status.lalamove.configured) {
      return {
        ok: false,
        provider: "lalamove",
        message: "LALAMOVE_API_KEY dan LALAMOVE_API_SECRET belum diisi di .env",
      };
    }
    try {
      const quote = await quoteLalamove({
        settings: merged,
        origin,
        destination,
        address: destination.displayName,
      });
      return {
        ok: quote.source === "lalamove_api",
        provider: "lalamove",
        message:
          quote.source === "lalamove_api"
            ? `Berhasil — tarif resmi: Rp ${quote.fee.toLocaleString("id-ID")}`
            : quote.note,
        quote,
        environment: status.lalamove.sandbox ? "sandbox" : "production",
      };
    } catch (error) {
      return { ok: false, provider: "lalamove", message: error.message };
    }
  }

  if (provider === "gosend") {
    if (!status.gosend.configured) {
      return {
        ok: false,
        provider: "gosend",
        message: "GOSEND_API_BASE, GOSEND_CLIENT_ID, dan GOSEND_PASS_KEY belum diisi di .env",
      };
    }
    try {
      const quote = await quoteGoSend({ settings: merged, origin, destination });
      return {
        ok: quote.source === "gosend_api",
        provider: "gosend",
        message:
          quote.source === "gosend_api"
            ? `Berhasil — tarif resmi: Rp ${quote.fee.toLocaleString("id-ID")}`
            : quote.note,
        quote,
        environment: status.gosend.baseUrl,
      };
    } catch (error) {
      return { ok: false, provider: "gosend", message: error.message };
    }
  }

  throw new Error("Provider tidak dikenal.");
}

function normalizeCoordPair(lat, lng) {
  let a = Number(lat);
  let b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    const swapped = a;
    a = b;
    b = swapped;
  }
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  if (Math.abs(a) < 0.0001 && Math.abs(b) < 0.0001) return null;
  return { lat: a, lng: b };
}

function extractFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s<>"'\]\)]+/i);
  if (!match) return null;
  return match[0].replace(/[),.;]+$/g, "");
}

function parseCoordinatesFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const tryPair = (first, second) => normalizeCoordPair(first, second);

  const geoMatch = raw.match(/geo:\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/i);
  if (geoMatch) {
    const pair = tryPair(geoMatch[1], geoMatch[2]);
    if (pair) return pair;
  }

  const bangMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    const pair = tryPair(bangMatch[1], bangMatch[2]);
    if (pair) return pair;
  }

  const atMatch = raw.match(/@(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (atMatch) {
    const pair = tryPair(atMatch[1], atMatch[2]);
    if (pair) return pair;
  }

  const queryMatch = raw.match(
    /[?&#](?:q|query|ll|sll|destination|center|daddr|cid)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i
  );
  if (queryMatch) {
    const pair = tryPair(queryMatch[1], queryMatch[2]);
    if (pair) return pair;
  }

  const pairMatch = raw.match(/(-?\d+\.\d+)\s*[,;]\s*(-?\d+\.\d+)/);
  if (pairMatch) {
    const pair = tryPair(pairMatch[1], pairMatch[2]);
    if (pair) return pair;
  }

  return null;
}

function parseCoordinatesFromHtml(html) {
  const snippet = String(html || "").slice(0, 250000);
  const bangMatch = snippet.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    const pair = normalizeCoordPair(bangMatch[1], bangMatch[2]);
    if (pair) return pair;
  }
  const atMatch = snippet.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,\d)/);
  if (atMatch) {
    const pair = normalizeCoordPair(atMatch[1], atMatch[2]);
    if (pair) return pair;
  }
  const metaMatch = snippet.match(
    /<meta[^>]+content=["'][^"']*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)[^"']*["']/i
  );
  if (metaMatch) {
    const pair = normalizeCoordPair(metaMatch[1], metaMatch[2]);
    if (pair) return pair;
  }
  return null;
}

function extractPlaceNameFromMapUrl(url) {
  try {
    const parsed = new URL(url);
    const place = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (place) {
      const name = decodeURIComponent(place[1].replace(/\+/g, " ")).trim();
      if (name && !/^-?\d/.test(name) && name.toLowerCase() !== "place") return name;
    }
    const q = parsed.searchParams.get("q") || parsed.searchParams.get("query");
    if (q && !/^-?\d+\.?\d*\s*,/.test(q) && !/^[\d.,\s-]+$/.test(q)) {
      return q.trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

function isAllowedMapHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "g.co" ||
    host === "google.com" ||
    host === "maps.apple.com" ||
    host.endsWith(".google.com") ||
    host.endsWith(".google.co.id") ||
    host.endsWith(".apple.com")
  );
}

function unwrapNestedMapUrl(url) {
  try {
    const parsed = new URL(url);
    const nested = parsed.searchParams.get("q") || parsed.searchParams.get("u") || parsed.searchParams.get("url");
    if (nested && /^https?:\/\//i.test(nested) && /(?:maps|goo\.gl|google)/i.test(nested)) {
      return nested;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function extractRedirectFromHtml(html, baseUrl) {
  const snippet = String(html || "").slice(0, 80000);
  const canonical = snippet.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || snippet.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (canonical?.[1]) {
    try {
      return new URL(canonical[1], baseUrl).href;
    } catch {
      /* ignore */
    }
  }
  const refresh = snippet.match(/http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i)
    || snippet.match(/content=["'][^"']*url=([^"']+)["'][^>]+http-equiv=["']refresh["']/i);
  if (refresh?.[1]) {
    try {
      return new URL(refresh[1].replace(/&amp;/g, "&"), baseUrl).href;
    } catch {
      /* ignore */
    }
  }
  const assigned = snippet.match(/location(?:\.href|\.replace)?\s*=\s*["'](https?:\/\/[^"']+)["']/i);
  if (assigned?.[1]) return assigned[1];
  const mapsLink = snippet.match(/https?:\/\/(?:www\.)?(?:google\.[^/"']+\/maps|maps\.google\.[^/"']+)[^"'\s<>]*/i);
  if (mapsLink?.[0]) return mapsLink[0].replace(/&amp;/g, "&");
  return "";
}

async function expandShortMapUrl(startUrl) {
  let current = unwrapNestedMapUrl(startUrl);
  const seen = new Set();

  for (let hop = 0; hop < 8; hop += 1) {
    current = unwrapNestedMapUrl(current);
    if (seen.has(current)) break;
    seen.add(current);

    let hostname = "";
    try {
      hostname = new URL(current).hostname;
    } catch {
      break;
    }
    if (!isAllowedMapHost(hostname)) break;

    const fromUrl = parseCoordinatesFromText(current);
    if (fromUrl) {
      return {
        coords: fromUrl,
        finalUrl: current,
        address: extractPlaceNameFromMapUrl(current),
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    const location = response.headers.get("location");
    if (location && [301, 302, 303, 307, 308].includes(response.status)) {
      current = new URL(location, current).href;
      continue;
    }

    if (response.status >= 200 && response.status < 400) {
      const followController = new AbortController();
      const followTimer = setTimeout(() => followController.abort(), 10000);
      try {
        const followed = await fetch(current, {
          method: "GET",
          redirect: "follow",
          signal: followController.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });
        const followedUrl = followed.url || current;
        const fromFollowed = parseCoordinatesFromText(followedUrl);
        if (fromFollowed) {
          clearTimeout(followTimer);
          return {
            coords: fromFollowed,
            finalUrl: followedUrl,
            address: extractPlaceNameFromMapUrl(followedUrl),
          };
        }
        const followedHtml = await followed.text();
        const htmlRedirect = extractRedirectFromHtml(followedHtml, followedUrl);
        if (htmlRedirect && htmlRedirect !== current && !seen.has(htmlRedirect)) {
          clearTimeout(followTimer);
          current = htmlRedirect;
          continue;
        }
        const htmlCoords = parseCoordinatesFromHtml(followedHtml);
        if (htmlCoords) {
          clearTimeout(followTimer);
          return {
            coords: htmlCoords,
            finalUrl: followedUrl,
            address: extractPlaceNameFromMapUrl(followedUrl),
          };
        }
      } catch {
        /* fallback to manual body below */
      } finally {
        clearTimeout(followTimer);
      }
    }

    const html = await response.text();
    const finalUrl = response.url || current;
    const htmlRedirect = extractRedirectFromHtml(html, finalUrl);
    if (htmlRedirect && htmlRedirect !== current && !seen.has(htmlRedirect)) {
      current = htmlRedirect;
      continue;
    }

    const coords =
      parseCoordinatesFromText(finalUrl) ||
      parseCoordinatesFromHtml(html) ||
      parseCoordinatesFromText(current);
    return {
      coords,
      finalUrl,
      address: extractPlaceNameFromMapUrl(finalUrl) || extractPlaceNameFromMapUrl(current),
    };
  }

  return {
    coords: parseCoordinatesFromText(current),
    finalUrl: current,
    address: extractPlaceNameFromMapUrl(current),
  };
}

async function resolveLocationFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const direct = parseCoordinatesFromText(raw);
  if (direct) {
    return { ...direct, address: "", source: "text" };
  }

  const url = extractFirstUrl(raw);
  if (!url) return null;

  const expanded = await expandShortMapUrl(url);
  if (expanded?.coords) {
    return {
      ...expanded.coords,
      address: expanded.address || "",
      source: "map_url",
    };
  }

  const placeName = expanded?.address || "";
  if (placeName) {
    const geo = await geocodeAddress(placeName);
    if (geo) {
      return {
        lat: geo.lat,
        lng: geo.lng,
        address: geo.displayName || placeName,
        source: "geocode",
      };
    }
  }

  return null;
}

module.exports = {
  DEFAULT_SHIPPING_SETTINGS,
  mergeShippingSettings,
  getShippingOptions,
  calculateShippingQuote,
  getShippingProviderStatus,
  testShippingProvider,
  geocodeAddress,
  haversineKm,
  parseCoordinatesFromText,
  resolveLocationFromText,
};
