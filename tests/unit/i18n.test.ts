import { describe, expect, it } from "vitest";
import { formatMessage } from "@/lib/i18n";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

describe("formatMessage", () => {
  it("interpolates variables and leaves unknown ones visible", () => {
    expect(formatMessage("Namaste {name}", { name: "Priya" })).toBe("Namaste Priya");
    expect(formatMessage("{a} {b}", { a: 1 })).toBe("1 {b}");
  });
  it("resolves gender selects and falls back to other", () => {
    const t = "{name} {gender, select, male {आया} other {आई}} · {time}";
    expect(formatMessage(t, { name: "Raju", gender: "male", time: "8:05" })).toBe("Raju आया · 8:05");
    expect(formatMessage(t, { name: "Sunita", gender: "female", time: "7:42" })).toBe("Sunita आई · 7:42");
    expect(formatMessage(t, { name: "X", time: "1:00" })).toBe("X आई · 1:00");
  });
  it("picks singular or plural by count", () => {
    const t = "{count} {count, plural, one {day} other {days}} pending";
    expect(formatMessage(t, { count: 1 })).toBe("1 day pending");
    expect(formatMessage(t, { count: 3 })).toBe("3 days pending");
    expect(formatMessage(t, { count: 0 })).toBe("0 days pending");
  });
  it("handles placeholders inside select branches", () => {
    const t = "{name} {gender, select, male {बोल रहा है {date} को आया} other {बोल रही है {date} को आई}}";
    expect(formatMessage(t, { name: "Ramu", gender: "male", date: "24 सितंबर" })).toBe("Ramu बोल रहा है 24 सितंबर को आया");
  });
});

type Tree = Record<string, Record<string, string>>;
const keys = (tree: Tree) => Object.entries(tree).flatMap(([a, v]) => Object.keys(v).map((b) => `${a}.${b}`)).sort();
/** Variable names a message uses: plain `{name}` and the selector of `{gender, select, …}`, recursing into branches. */
function variables(msg: string): Set<string> {
  const out = new Set<string>();
  const walk = (text: string) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open === -1) return;
      let depth = 0;
      let close = open;
      for (; close < text.length; close++) {
        if (text[close] === "{") depth += 1;
        else if (text[close] === "}" && --depth === 0) break;
      }
      const inner = text.slice(open + 1, close);
      const sel = /^(\w+),\s*(?:select|plural),\s*([^]*)$/.exec(inner);
      if (sel) {
        out.add(sel[1]);
        // Branch bodies are `key {text}`; walk only the text parts.
        const body = sel[2];
        let j = 0;
        while (j < body.length) {
          const b = body.indexOf("{", j);
          if (b === -1) break;
          let d = 0;
          let e = b;
          for (; e < body.length; e++) {
            if (body[e] === "{") d += 1;
            else if (body[e] === "}" && --d === 0) break;
          }
          walk(body.slice(b + 1, e));
          j = e + 1;
        }
      } else if (/^\w+$/.test(inner)) {
        out.add(inner);
      }
      i = close + 1;
    }
  };
  walk(msg);
  return out;
}

describe("message files", () => {
  it("hi.json has exactly the keys of en.json", () => {
    expect(keys(hi as Tree)).toEqual(keys(en as Tree));
  });
  it("every Hindi string uses the same variables as English (gender may be added)", () => {
    for (const [a, section] of Object.entries(en as Tree)) {
      for (const [b, msg] of Object.entries(section)) {
        const enVars = variables(msg);
        const hiVars = variables((hi as Tree)[a][b]);
        enVars.delete("gender");
        hiVars.delete("gender");
        expect([...hiVars].sort(), `${a}.${b}`).toEqual([...enVars].sort());
      }
    }
  });
  it("every message renders without leftover braces for both genders", () => {
    const vars = { name: "X", time: "1:00", date: "1 Sept", count: 2, house: "H", link: "L", email: "e", n: 1, amount: "₹1", free: 1, unpaid: 1, days: 1, rate: "₹1", percent: 1, from: "a", to: "b", who: "w", state: "s", seconds: 3, claims: 1, unknown: 1, names: "A, B", reason: "r", month: "Sept" };
    for (const tree of [en, hi] as Tree[]) {
      for (const section of Object.values(tree)) {
        for (const msg of Object.values(section)) {
          for (const gender of ["female", "male"]) {
            expect(formatMessage(msg, { ...vars, gender })).not.toMatch(/[{}]/);
          }
        }
      }
    }
  });
});
