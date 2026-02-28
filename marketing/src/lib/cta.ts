const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'ref',
] as const;

const SAFE_DEFAULT_TRY_FOR_FREE_URL = 'http://localhost:3000';

export function buildTryForFreeUrl(baseUrl: string, currentUrl: URL): string {
  const normalizedBase = baseUrl.trim() || SAFE_DEFAULT_TRY_FOR_FREE_URL;

  let destination: URL;

  try {
    destination = new URL(normalizedBase, currentUrl.origin);
  } catch {
    destination = new URL(SAFE_DEFAULT_TRY_FOR_FREE_URL);
  }

  for (const key of ATTRIBUTION_PARAMS) {
    const inboundValues = currentUrl.searchParams.getAll(key);

    if (inboundValues.length === 0) {
      continue;
    }

    destination.searchParams.delete(key);

    for (const value of inboundValues) {
      destination.searchParams.append(key, value);
    }
  }

  return destination.toString();
}
