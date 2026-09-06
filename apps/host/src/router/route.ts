import { resolveHid } from "./hid";

// IA §3: сегменты первого уровня внутри пространства, зарезервированные
// шеллом. "a" открывает зону монтирования подприложений; appId не может
// совпасть ни с одним из них, потому что appId всегда стоит после "a/".
export const RESERVED_SPACE_SEGMENTS = ["a", "catalog", "inbox", "search", "settings"] as const;

const AREA_SEGMENTS = ["catalog", "inbox", "search", "settings"] as const;
type AreaSegment = (typeof AREA_SEGMENTS)[number];

function isAreaSegment(value: string): value is AreaSegment {
  return (AREA_SEGMENTS as readonly string[]).includes(value);
}

export type SpaceArea =
  | { kind: "app"; appId: string; appPath: string; basename: string }
  | { kind: AreaSegment }
  | { kind: "home" };

export type Route =
  | { kind: "space"; hid: string; hidSegment: string; area: SpaceArea }
  | { kind: "not-found" };

function splitSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export function computeBasename(hidSegment: string, appId: string): string {
  return `/h/${hidSegment}/a/${appId}`;
}

export function buildAppPath(hidSegment: string, appId: string, appPath = "/"): string {
  const suffix = appPath === "/" || appPath === "" ? "" : appPath;
  return `${computeBasename(hidSegment, appId)}${suffix}`;
}

// IA §2/§4: /h/:hid/a/:appId/* — всё до "a/:appId" принадлежит shell,
// остальное подприложению.
export function parseRoute(pathname: string): Route {
  const segments = splitSegments(pathname);
  if (segments[0] !== "h" || !segments[1]) {
    return { kind: "not-found" };
  }

  const hidSegment = segments[1];
  const hid = resolveHid(hidSegment);

  if (segments.length === 2) {
    return { kind: "space", hid, hidSegment, area: { kind: "home" } };
  }

  const next = segments[2];
  if (next === "a") {
    const appId = segments[3];
    if (!appId) return { kind: "not-found" };
    const appPath = `/${segments.slice(4).join("/")}`;
    return {
      kind: "space",
      hid,
      hidSegment,
      area: { kind: "app", appId, appPath, basename: computeBasename(hidSegment, appId) },
    };
  }

  if (isAreaSegment(next)) {
    return { kind: "space", hid, hidSegment, area: { kind: next } };
  }

  return { kind: "not-found" };
}
