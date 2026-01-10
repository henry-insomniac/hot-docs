export function withBase(base: string, pathname: string): string {
  const normalizedBase = normalizeBase(base);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedBase === "/") return normalizedPathname;
  if (normalizedPathname === "/") return normalizedBase;

  const baseNoTrailingSlash = normalizedBase.endsWith("/") ? normalizedBase.slice(0, -1) : normalizedBase;
  return `${baseNoTrailingSlash}${normalizedPathname}`;
}

export function stripBase(base: string, pathname: string): string {
  const normalizedBase = normalizeBase(base);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedBase === "/") return normalizedPathname;

  const baseNoTrailingSlash = normalizedBase.endsWith("/") ? normalizedBase.slice(0, -1) : normalizedBase;

  if (normalizedPathname === baseNoTrailingSlash) return "/";
  if (normalizedPathname.startsWith(`${baseNoTrailingSlash}/`)) {
    const stripped = normalizedPathname.slice(baseNoTrailingSlash.length);
    return normalizePathname(stripped);
  }

  return normalizedPathname;
}

export function toPageHref(base: string, routePath: string): string {
  const normalizedRoutePath = trimTrailingSlash(normalizePathname(routePath));
  if (normalizedRoutePath === "/") return withBase(base, "/");
  return `${withBase(base, normalizedRoutePath)}/`;
}

export function trimTrailingSlash(pathname: string): string {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return "/";
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function normalizeBase(base: string): string {
  if (!base) return "/";
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base;
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  return pathname.replace(/\/+/g, "/");
}

