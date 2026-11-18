export const TITLE_MAX = 120;
export const BODY_MAX = 5000;
export const COMMENT_MAX = 1000;
export const MAX_IMAGES = 4;

// Trim every kind of whitespace at both ends (as the database does), then check the length in characters.
function clean(value: string, max: number): string | null {
  const text = value.replace(/^[\s​﻿]+|[\s​﻿]+$/g, "");
  return text === "" || [...text].length > max ? null : text;
}

export const cleanTitle = (value: string) => clean(value, TITLE_MAX);
export const cleanBody = (value: string) => clean(value, BODY_MAX);
export const cleanComment = (value: string) => clean(value, COMMENT_MAX);
