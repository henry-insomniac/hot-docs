import path from "node:path";

export function posixPath(p: string): string {
  return p.split(path.sep).join("/");
}

export function joinUrlPath(base: string, suffix: string): string {
  const baseNorm = base === "/" ? "" : base;
  const suffixNorm = suffix ? `/${suffix}` : "";
  const joined = `${baseNorm}${suffixNorm}`.replace(/\/+/g, "/");
  return joined === "" ? "/" : joined;
}

export function toRoutePath(routeBase: string, relativePath: string): string {
  const posixRel = posixPath(relativePath);
  const withoutExt = posixRel.replace(/\.(md|markdown)$/i, "");
  const trimmed = withoutExt === "index" ? "" : withoutExt.endsWith("/index") ? withoutExt.slice(0, -"/index".length) : withoutExt;

  const joined = joinUrlPath(routeBase, trimmed);
  return joined === "" ? "/" : joined;
}
