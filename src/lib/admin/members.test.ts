import { describe, expect, it } from "vitest";
import { ADMIN_MEMBERS_PAGE_SIZE, directoryLabel, formatDate } from "./members";

describe("directoryLabel", () => {
  it("says Yes, No or No name", () => {
    expect(directoryLabel("yes")).toBe("Yes");
    expect(directoryLabel("no")).toBe("No");
    expect(directoryLabel("no-name")).toBe("No name");
  });

  it("shows a dash for anything unexpected", () => {
    for (const status of ["", "maybe", "YES", "toString", "__proto__"]) {
      expect(directoryLabel(status)).toBe("—");
    }
  });
});

describe("formatDate", () => {
  it("shows the UTC date", () => {
    expect(formatDate("2026-10-23T18:30:00Z")).toBe("2026-10-23");
    expect(formatDate("2026-10-23T23:59:59.999+00:00")).toBe("2026-10-23");
  });

  it("shows a dash when there is no date or it cannot be read", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("ADMIN_MEMBERS_PAGE_SIZE", () => {
  it("is 50", () => {
    expect(ADMIN_MEMBERS_PAGE_SIZE).toBe(50);
  });
});
