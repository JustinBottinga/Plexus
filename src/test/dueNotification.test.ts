import { describe, expect, it } from "vitest";
import { dueMessage, shouldNotify, studiedToday } from "@/lib/dueNotification";

const base = {
  enabled: true,
  permission: "granted" as const,
  hidden: true,
  dueCount: 5,
  studiedToday: false,
  today: "2026-10-08",
  lastNotifiedOn: "2026-10-07",
};

describe("shouldNotify", () => {
  it("notifies when cards are due and the app is in the background", () => {
    expect(shouldNotify(base)).toBe(true);
  });

  it("is at most one per day", () => {
    expect(shouldNotify({ ...base, lastNotifiedOn: "2026-10-08" })).toBe(false);
  });

  it("stays quiet when nothing is due, the user already practised, or they are looking at the app", () => {
    expect(shouldNotify({ ...base, dueCount: 0 })).toBe(false);
    expect(shouldNotify({ ...base, studiedToday: true })).toBe(false);
    expect(shouldNotify({ ...base, hidden: false })).toBe(false);
  });

  it("needs the setting on and permission granted", () => {
    expect(shouldNotify({ ...base, enabled: false })).toBe(false);
    expect(shouldNotify({ ...base, permission: "denied" })).toBe(false);
    expect(shouldNotify({ ...base, permission: "default" })).toBe(false);
    expect(shouldNotify({ ...base, permission: "unsupported" })).toBe(false);
  });
});

describe("studiedToday", () => {
  it("counts a rating from today's local date only", () => {
    const now = new Date(2026, 9, 8, 14, 0).toISOString();
    const yesterday = new Date(2026, 9, 7, 23, 59).toISOString();
    expect(studiedToday([{ last_reviewed: now }], "2026-10-08")).toBe(true);
    expect(studiedToday([{ last_reviewed: yesterday }, { last_reviewed: null }], "2026-10-08")).toBe(false);
    expect(studiedToday([], "2026-10-08")).toBe(false);
  });
});

describe("dueMessage", () => {
  it("uses singular and plural", () => {
    expect(dueMessage(1)).toBe("Er staat 1 kaart klaar om te oefenen.");
    expect(dueMessage(12)).toBe("Er staan 12 kaarten klaar om te oefenen.");
  });
});
