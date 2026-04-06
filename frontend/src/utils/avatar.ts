const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

export function getInitials(name?: string, fallback = "U") {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

export function resolveAvatarSrc(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return API_BASE ? `${API_BASE}${raw}` : raw;
  return API_BASE ? `${API_BASE}/${raw}` : raw;
}
