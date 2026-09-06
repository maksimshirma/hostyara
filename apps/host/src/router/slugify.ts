const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const MAX_SLUG_LENGTH = 24;

function transliterate(text: string): string {
  return Array.from(text.toLowerCase())
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

// IA §2: транслитерация, нижний регистр, дефисы вместо пробелов, обрезка до ~24 символов.
export function slugify(text: string): string {
  const slug = transliterate(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "");
}
