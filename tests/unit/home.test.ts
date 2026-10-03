import { describe, expect, it } from "vitest";
import { homeLabel } from "@/lib/home";

describe("homeLabel – homes in one building are told apart by flat number", () => {
  it("puts the flat first", () => {
    expect(homeLabel("M.R. Residency", "B-402")).toBe("B-402, M.R. Residency");
  });
  it("falls back to the building name", () => {
    expect(homeLabel("M.R. Residency", "")).toBe("M.R. Residency");
    expect(homeLabel("M.R. Residency", null)).toBe("M.R. Residency");
    expect(homeLabel("M.R. Residency", "  ")).toBe("M.R. Residency");
  });
});
