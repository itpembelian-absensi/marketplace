const SHIPMENT_STATUS_LIST = [
  { key: "pending", label: "Menunggu proses" },
  { key: "packed", label: "Dikemas" },
  { key: "ready_pickup", label: "Siap diambil" },
  { key: "shipped", label: "Dalam pengiriman" },
  { key: "delivered", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

const STATUS_SET = new Set(SHIPMENT_STATUS_LIST.map((item) => item.key));

function shipmentStatusLabel(status) {
  const found = SHIPMENT_STATUS_LIST.find((item) => item.key === status);
  return found ? found.label : "Menunggu proses";
}

function normalizeShipmentStatus(raw, orderStatus) {
  if (String(orderStatus || "").toLowerCase() === "void") return "cancelled";
  const value = String(raw || "").trim().toLowerCase();
  if (STATUS_SET.has(value)) return value;
  return "pending";
}

function publicTrackingUrl(trackingNumber, trackingUrl) {
  const url = String(trackingUrl || "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  const number = String(trackingNumber || "").trim();
  if (!number) return "";
  return `https://cekresi.com/?noresi=${encodeURIComponent(number)}`;
}

function normalizePhoneDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62") && digits.length > 8) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("8") && digits.length >= 9) digits = `0${digits}`;
  return digits;
}

function phonesMatch(stored, input) {
  const a = normalizePhoneDigits(stored);
  const b = normalizePhoneDigits(input);
  if (!a || !b || b.length < 8) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

function shipmentFlowForMethod(method) {
  if (String(method || "").toLowerCase() === "pickup") {
    return ["pending", "packed", "ready_pickup", "delivered"];
  }
  return ["pending", "packed", "shipped", "delivered"];
}

function buildShipmentSteps(method, status) {
  const current = normalizeShipmentStatus(status);
  if (current === "cancelled") {
    return [
      ...shipmentFlowForMethod(method).map((key) => ({
        key,
        label: shipmentStatusLabel(key),
        done: false,
        current: false,
      })),
      { key: "cancelled", label: shipmentStatusLabel("cancelled"), done: false, current: true },
    ];
  }
  const flow = shipmentFlowForMethod(method);
  let idx = flow.indexOf(current);
  if (idx < 0) idx = 0;
  return flow.map((key, index) => ({
    key,
    label: shipmentStatusLabel(key),
    done: current === "delivered" ? true : index < idx,
    current: index === idx,
  }));
}

function mapShipmentFields(row) {
  const shipmentStatus = normalizeShipmentStatus(row?.shipment_status, row?.status);
  const trackingNumber = String(row?.tracking_number || "").trim();
  const trackingUrl = publicTrackingUrl(trackingNumber, row?.tracking_url);
  return {
    shipmentStatus,
    shipmentStatusLabel: shipmentStatusLabel(shipmentStatus),
    trackingNumber,
    trackingUrl,
    shipmentNote: String(row?.shipment_note || "").trim(),
    shipmentUpdatedAt: row?.shipment_updated_at || "",
    shipmentSteps: buildShipmentSteps(row?.shipping_method, shipmentStatus),
  };
}

module.exports = {
  SHIPMENT_STATUS_LIST,
  shipmentStatusLabel,
  normalizeShipmentStatus,
  publicTrackingUrl,
  phonesMatch,
  shipmentFlowForMethod,
  buildShipmentSteps,
  mapShipmentFields,
};
