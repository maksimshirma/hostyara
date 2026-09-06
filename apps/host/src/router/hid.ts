import { slugify } from "./slugify";

// IA §2: "Резолвится всё до первого дефиса. Остальное при поиске
// пространства игнорируется."
export function resolveHid(hidSegment: string): string {
  const hyphenIndex = hidSegment.indexOf("-");
  return hyphenIndex === -1 ? hidSegment : hidSegment.slice(0, hyphenIndex);
}

// IA §2: каноническая форма — hid + транслитерированное название.
// Без названия (или если оно нетранслитерируемо) каноническая форма —
// голый hid.
export function canonicalizeHidSegment(hid: string, name: string | undefined): string {
  if (!name) return hid;
  const slug = slugify(name);
  return slug ? `${hid}-${slug}` : hid;
}
