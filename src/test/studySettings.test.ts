import { beforeEach, describe, expect, it } from "vitest";
import { assignDirections, isStudyable } from "@/lib/queue";
import { fromDirParam, loadSettings, saveSettings, sessionSearch, toDirParam } from "@/lib/studySettings";
import type { Card } from "@/lib/data";

const marker = { x: 10, y: 10, w: 20, h: 20 };
const card = (id: string, withMarker: boolean) => ({ id, category_id: "c", marker: withMarker ? marker : null }) as unknown as Card;

beforeEach(() => localStorage.clear());

describe("directions in the settings", () => {
  it("defaults to naam bij afbeelding", () => {
    expect(loadSettings().directions).toEqual(["image"]);
  });

  it("reads the single direction an earlier version stored", () => {
    localStorage.setItem("study-settings", JSON.stringify({ direction: "location", newLimit: 5 }));
    expect(loadSettings()).toMatchObject({ directions: ["location"], newLimit: 5 });
  });

  it("keeps both directions, in a fixed order, and never ends up empty", () => {
    saveSettings({ categories: [], directions: ["location", "image"], newLimit: 10 });
    expect(loadSettings().directions).toEqual(["image", "location"]);
    localStorage.setItem("study-settings", JSON.stringify({ directions: [] }));
    expect(loadSettings().directions).toEqual(["image"]);
  });
});

describe("the dir search param", () => {
  it("maps the direction set to one value and back", () => {
    expect(toDirParam(["image"])).toBe("image");
    expect(toDirParam(["location"])).toBe("location");
    expect(toDirParam(["image", "location"])).toBe("both");
    expect(fromDirParam("both")).toEqual(["image", "location"]);
    expect(fromDirParam("location")).toEqual(["location"]);
  });

  it("goes into the session search", () => {
    expect(sessionSearch({ directions: ["image", "location"], newLimit: 5 }, ["a", "b"], true)).toEqual({
      dir: "both",
      new: 5,
      practice: 1,
      cats: "a,b",
    });
  });
});

describe("isStudyable and assignDirections", () => {
  it("studies cards without a marker only in the image direction", () => {
    expect(isStudyable(card("a", false), ["location"])).toBe(false);
    expect(isStudyable(card("a", false), ["image", "location"])).toBe(true);
    expect(isStudyable(card("a", true), ["location"])).toBe(true);
  });

  it("gives every card a direction it can be asked in", () => {
    const cards = [card("a", true), card("b", false), card("c", true)];
    const dirs = assignDirections(cards, ["image", "location"], () => 0.99);
    expect(dirs.get("a")).toBe("location");
    expect(dirs.get("b")).toBe("image"); // no marker: only the image direction works
    expect(assignDirections(cards, ["image", "location"], () => 0).get("a")).toBe("image");
    expect(assignDirections(cards, ["location"]).get("c")).toBe("location");
  });

  it("mixes both directions over a larger set", () => {
    const cards = Array.from({ length: 60 }, (_, i) => card(String(i), true));
    const used = new Set(assignDirections(cards, ["image", "location"]).values());
    expect(used).toEqual(new Set(["image", "location"]));
  });
});
