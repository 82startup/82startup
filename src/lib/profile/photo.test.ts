import { describe, expect, it } from "vitest";
import {
  avatarPath,
  avatarPublicUrl,
  checkSourceFile,
  isOwnAvatarPath,
  MAX_SOURCE_BYTES,
  nextQuality,
  pathFromAvatarUrl,
  squareCrop,
} from "./photo";

const UID = "11111111-2222-3333-4444-555555555555";
const ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const BASE = "https://proj.supabase.co";

describe("checkSourceFile", () => {
  it("accepts jpeg, png and webp up to 15 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(checkSourceFile({ type, size: 1000 })).toBe("ok");
      expect(checkSourceFile({ type, size: MAX_SOURCE_BYTES })).toBe("ok");
    }
  });

  it("refuses other types", () => {
    for (const type of ["image/heic", "image/gif", "image/svg+xml", "application/pdf", ""]) {
      expect(checkSourceFile({ type, size: 1000 })).toBe("type");
    }
  });

  it("refuses an empty file and one over 15 MB", () => {
    expect(checkSourceFile({ type: "image/jpeg", size: 0 })).toBe("size");
    expect(checkSourceFile({ type: "image/jpeg", size: MAX_SOURCE_BYTES + 1 })).toBe("size");
  });
});

describe("squareCrop", () => {
  it("cuts the largest centred square", () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, size: 3000 });
    expect(squareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, size: 3000 });
    expect(squareCrop(800, 800)).toEqual({ sx: 0, sy: 0, size: 800 });
    expect(squareCrop(1, 1)).toEqual({ sx: 0, sy: 0, size: 1 });
  });

  it("uses whole pixels", () => {
    expect(squareCrop(1001, 600)).toEqual({ sx: 200, sy: 0, size: 600 });
    expect(squareCrop(601, 1000)).toEqual({ sx: 0, sy: 199, size: 601 });
  });
});

describe("nextQuality", () => {
  it("steps down 0.82, 0.72, 0.62, 0.52 and then stops", () => {
    expect(nextQuality(0.82)).toBe(0.72);
    expect(nextQuality(0.72)).toBe(0.62);
    expect(nextQuality(0.62)).toBe(0.52);
    expect(nextQuality(0.52)).toBeNull();
  });

  it("gives null for a quality that is not a step", () => {
    expect(nextQuality(0.5)).toBeNull();
    expect(nextQuality(1)).toBeNull();
  });
});

describe("avatar paths", () => {
  it("builds the object path", () => {
    expect(avatarPath(UID, ID)).toBe(`${UID}/${ID}.jpg`);
  });

  it("accepts exactly <own id>/<lower-case uuid>.jpg", () => {
    expect(isOwnAvatarPath(`${UID}/${ID}.jpg`, UID)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const path of [
      `99999999-2222-3333-4444-555555555555/${ID}.jpg`,
      `${UID}/../${ID}.jpg`,
      `${UID}/sub/${ID}.jpg`,
      `${UID}/${ID.toUpperCase()}.jpg`,
      `${UID}/${ID}.png`,
      `${UID}/${ID}.jpg.exe`,
      `${UID}/${ID}.jpg\n`,
      ` ${UID}/${ID}.jpg`,
      `${UID}/photo.jpg`,
      `${ID}.jpg`,
      "",
    ]) {
      expect(isOwnAvatarPath(path, UID)).toBe(false);
    }
  });
});

describe("avatarPublicUrl and pathFromAvatarUrl", () => {
  it("builds the public address and reads the path back", () => {
    const url = avatarPublicUrl(BASE, `${UID}/${ID}.jpg`);
    expect(url).toBe(`${BASE}/storage/v1/object/public/avatars/${UID}/${ID}.jpg`);
    expect(pathFromAvatarUrl(url, BASE)).toBe(`${UID}/${ID}.jpg`);
  });

  it("returns null for anything that is not this project's avatar address", () => {
    for (const url of [
      "https://other.supabase.co/storage/v1/object/public/avatars/a/b.jpg",
      `${BASE}/storage/v1/object/public/other/a/b.jpg`,
      `${BASE}/storage/v1/object/public/avatars-evil/a/b.jpg`,
      "https://lh3.googleusercontent.com/a/x",
      "not a url",
      "",
      null,
      undefined,
    ]) {
      expect(pathFromAvatarUrl(url as string | null | undefined, BASE)).toBeNull();
    }
  });
});
