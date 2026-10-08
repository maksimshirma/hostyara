// IA §3: query-параметры без префикса "_" принадлежат подприложению — shell
// не должен их переписывать. TanStack по умолчанию разбирает search как JSON
// и при монтировании заменяет URL на пересобранный. Здесь значения остаются
// строками, а пока объект не менялся, обратно отдаётся исходная строка —
// байт-в-байт, с тем же кодированием и порядком.

export type SearchRecord = Record<string, string>;

const MAX_REMEMBERED = 50;
const rawByEntries = new Map<string, string>();

function entriesKey(search: SearchRecord): string {
  return JSON.stringify(Object.entries(search));
}

function remember(key: string, raw: string): void {
  rawByEntries.delete(key);
  rawByEntries.set(key, raw);
  if (rawByEntries.size > MAX_REMEMBERED) {
    rawByEntries.delete(rawByEntries.keys().next().value as string);
  }
}

export function parseSearchVerbatim(searchStr: string): SearchRecord {
  const raw = searchStr.startsWith("?") ? searchStr : searchStr ? `?${searchStr}` : "";
  const search = Object.fromEntries(new URLSearchParams(raw));
  remember(entriesKey(search), raw);
  return search;
}

export function stringifySearchVerbatim(search: Record<string, unknown>): string {
  const entries = Object.entries(search).filter(([, value]) => value !== undefined);
  const record = Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
  const raw = rawByEntries.get(entriesKey(record));
  if (raw !== undefined) return raw;
  const built = new URLSearchParams(record).toString();
  return built ? `?${built}` : "";
}
