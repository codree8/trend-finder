const trackingParamNames = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "source",
  "spm",
]);

function shouldDropParam(key: string) {
  const normalized = key.toLowerCase();
  return normalized.startsWith("utm_") || trackingParamNames.has(normalized);
}

function cleanPathname(pathname: string) {
  if (!pathname || pathname === "/") return "";
  return pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

function sortedSearchParams(searchParams: URLSearchParams) {
  const entries = [...searchParams.entries()]
    .filter(([key]) => !shouldDropParam(key))
    .sort(([aKey, aValue], [bKey, bValue]) => {
      const keyCompare = aKey.localeCompare(bKey);
      return keyCompare === 0 ? aValue.localeCompare(bValue) : keyCompare;
    });

  const nextParams = new URLSearchParams();
  for (const [key, value] of entries) {
    nextParams.append(key, value);
  }

  return nextParams.toString();
}

export function normalizeUrl(rawUrl: string | null | undefined) {
  const fallback = (rawUrl ?? "").trim();
  if (!fallback) return "";

  try {
    const url = new URL(fallback);
    const protocol = url.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return fallback.replace(/\s+/g, "");
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = cleanPathname(decodeURI(url.pathname));
    const search = sortedSearchParams(url.searchParams);

    return `${protocol}//${hostname}${pathname}${search ? `?${search}` : ""}`;
  } catch {
    return fallback.replace(/#.*$/, "").replace(/\s+/g, "");
  }
}

export function getNormalizedHostname(rawUrl: string | null | undefined) {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) return "";

  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    return "";
  }
}

export function getNormalizedPath(rawUrl: string | null | undefined) {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) return "";

  try {
    return cleanPathname(new URL(normalizedUrl).pathname);
  } catch {
    return "";
  }
}

export function normalizeTextForHash(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\b(the|a|an|and|or|to|for|of|in|on|with|by|from)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
