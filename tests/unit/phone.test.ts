import { describe, expect, it } from "vitest";
import { phoneKey } from "@/lib/phone";

describe("phoneKey – the same number written different ways matches", () => {
  it("keeps the last 10 digits", () => {
    for (const input of ["+91 98765 43210", "098765-43210", "9876543210", "+91-9876543210", "91 9876543210"]) {
      expect(phoneKey(input)).toBe("9876543210");
    }
  });
  it("is null when there is nothing to compare", () => {
    expect(phoneKey("")).toBeNull();
    expect(phoneKey(null)).toBeNull();
    expect(phoneKey("+91")).toBeNull();
    expect(phoneKey("98765 4321")).toBeNull();
  });
});
