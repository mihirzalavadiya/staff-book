/**
 * The comparable form of an Indian mobile number: its last 10 digits.
 * "+91 98765 43210", "098765-43210" and "9876543210" all give "9876543210".
 * Returns null when there are not 10 digits to compare.
 */
export function phoneKey(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}
