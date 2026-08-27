// Capitalizes each run of letters, treating spaces/hyphens/apostrophes as
// word breaks — "jean-luc o'brien" -> "Jean-Luc O'Brien". Not perfect for
// names with their own internal capitalization (McDonald, DeWitt), which is
// an inherent limit of any capitalization rule that doesn't consult a name
// database — still far better than leaving "JOHN SMITH" or "john smith" as
// typed, which is what this exists to fix.
export function toTitleCase(value: string): string {
  return value.replace(
    /[A-Za-zÀ-ÖØ-öø-ÿ]+/gu,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}
