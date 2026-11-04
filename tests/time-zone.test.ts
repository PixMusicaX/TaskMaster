// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TZ_COOKIE, dayIn, shiftDay } from "@/lib/time-zone";
import { themeInitScript } from "@/lib/theme-init";

describe("the player's day on the server", () => {
  it("reads the date in the player's time zone, not the server's", () => {
    const instant = new Date("2026-09-28T20:30:00Z");
    expect(dayIn("Asia/Kolkata", instant)).toBe("2026-09-29");
    expect(dayIn("America/Los_Angeles", instant)).toBe("2026-09-28");
    expect(dayIn("UTC", instant)).toBe("2026-09-28");
  });

  it("gives up on a zone it doesn't know", () => {
    expect(dayIn("Not/AZone")).toBeNull();
  });

  it("moves calendar dates across month and year ends", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-09-28", -365)).toBe("2025-09-28");
  });
});

describe("the head script", () => {
  beforeEach(() => { document.cookie = `${TZ_COOKIE}=; max-age=0; path=/`; });

  it("leaves the browser's time zone in a cookie", () => {
    new Function(themeInitScript)();
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(document.cookie).toContain(`${TZ_COOKIE}=${zone}`);
  });
});
