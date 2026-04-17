export type SearchParamValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, SearchParamValue> | undefined;

export function readSearchParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseCursorTrail(value: SearchParamValue) {
  const normalized = readSearchParam(value).trim();
  if (!normalized) {
    return [] as string[];
  }

  return normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function appendCursorTrail(
  pathname: string,
  searchParams: SearchParamsRecord,
  key: string,
  nextCursor: string,
) {
  const params = new URLSearchParams();

  for (const [paramKey, paramValue] of Object.entries(searchParams ?? {})) {
    if (paramKey === key || typeof paramValue === "undefined") {
      continue;
    }

    if (Array.isArray(paramValue)) {
      for (const value of paramValue) {
        params.append(paramKey, value);
      }
      continue;
    }

    params.set(paramKey, paramValue);
  }

  const trail = parseCursorTrail(searchParams?.[key]);
  trail.push(nextCursor);
  params.set(key, trail.join(","));

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildPathWithSearch(pathname: string, searchParams: SearchParamsRecord) {
  const params = new URLSearchParams();

  for (const [paramKey, paramValue] of Object.entries(searchParams ?? {})) {
    if (typeof paramValue === "undefined") {
      continue;
    }

    if (Array.isArray(paramValue)) {
      for (const value of paramValue) {
        params.append(paramKey, value);
      }
      continue;
    }

    params.set(paramKey, paramValue);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function collectPaginatedPages<TPage, TItem>(options: {
  trail: string[];
  loadPage: (cursor?: string) => Promise<TPage>;
  getItems: (page: TPage) => TItem[];
  getNextCursor: (page: TPage) => string;
}) {
  let page = await options.loadPage();
  const items = [...options.getItems(page)];
  let nextCursor = options.getNextCursor(page);

  for (const cursor of options.trail) {
    if (!nextCursor || nextCursor !== cursor) {
      break;
    }

    page = await options.loadPage(cursor);
    items.push(...options.getItems(page));
    nextCursor = options.getNextCursor(page);
  }

  return {
    items,
    nextCursor,
    lastPage: page,
  };
}
