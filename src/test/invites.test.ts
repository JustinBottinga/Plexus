import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/invites";

describe("safeRedirect", () => {
  it("accepts same-site paths", () => {
    expect(safeRedirect("/invite/abc")).toBe("/invite/abc");
    expect(safeRedirect("/home")).toBe("/home");
  });

  it("rejects anything that could leave the site", () => {
    const backslash = String.fromCharCode(92);
    for (const bad of ["//evil.com", `/${backslash}evil.com`,"https://evil.com", "javascript:alert(1)", "evil", "", null, undefined, 5]) {
      expect(safeRedirect(bad)).toBeNull();
    }
  });
});
