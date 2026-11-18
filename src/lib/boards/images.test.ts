import { describe, expect, it } from "vitest";
import { boardImagePath, boardImagePublicUrl, fitWithin, isBoardImagePath, isOwnBoardImagePath } from "./images";

const USER = "bbbbbbbb-1100-0000-0000-00000000000a";
const POST = "11111111-1111-1111-1111-111111111111";
const BASE = "http://127.0.0.1:55321";

describe("board image paths", () => {
  it("builds <user>/<post>/<n>.jpg", () => {
    expect(boardImagePath(USER, POST, 2)).toBe(`${USER}/${POST}/2.jpg`);
  });
  it("accepts only the member's own folder and post, numbered 1 to 4", () => {
    expect(isOwnBoardImagePath(`${USER}/${POST}/4.jpg`, USER, POST)).toBe(true);
    expect(isOwnBoardImagePath(`${USER}/${POST}/5.jpg`, USER, POST)).toBe(false);
    expect(isOwnBoardImagePath(`${USER}/${POST}/1.png`, USER, POST)).toBe(false);
    expect(isOwnBoardImagePath(`${USER}/22222222-2222-2222-2222-222222222222/1.jpg`, USER, POST)).toBe(false);
    expect(isOwnBoardImagePath(`bbbbbbbb-1100-0000-0000-00000000000b/${POST}/1.jpg`, USER, POST)).toBe(false);
  });
  it("recognises any well-formed path", () => {
    expect(isBoardImagePath(`${USER}/${POST}/3.jpg`)).toBe(true);
    expect(isBoardImagePath("https://evil.test/x.jpg")).toBe(false);
    expect(isBoardImagePath(`${USER}/${POST}/../1.jpg`)).toBe(false);
  });
  it("builds the public address only for a well-formed path", () => {
    expect(boardImagePublicUrl(`${BASE}/`, `${USER}/${POST}/1.jpg`)).toBe(`${BASE}/storage/v1/object/public/board-images/${USER}/${POST}/1.jpg`);
    expect(boardImagePublicUrl(BASE, "https://evil.test/x.jpg")).toBeNull();
  });
});

describe("fitWithin", () => {
  it("shrinks the long side to the limit and keeps the ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3000, 1600)).toEqual({ width: 533, height: 1600 });
  });
  it("never enlarges", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
