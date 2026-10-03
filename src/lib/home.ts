/** Max length for a flat / house number. */
export const FLAT_MAX = 30;

/**
 * How a home is named to workers: "B-402, M.R. Residency". Many homes share a
 * building, so the flat number comes first and is what tells them apart.
 */
export function homeLabel(name: string, flat?: string | null): string {
  const f = flat?.trim();
  return f ? `${f}, ${name}` : name;
}
