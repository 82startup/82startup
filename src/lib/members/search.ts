import { MEMBER_TYPES, type MemberType } from "@/lib/profile/schema";

export const PAGE_SIZE = 24;
const MAX_PAGE = 1000;
const MAX_QUERY = 80;

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Reads the directory's search address. Anything unexpected falls back to "no filter" and page 1.
export function parseMemberSearch(params: Params): { q: string; type: MemberType | null; page: number } {
  const q = first(params.q).trim().slice(0, MAX_QUERY);
  const rawType = first(params.type);
  const type = (MEMBER_TYPES as readonly string[]).includes(rawType) ? (rawType as MemberType) : null;
  const rawPage = first(params.page);
  const page = /^[1-9][0-9]{0,3}$/.test(rawPage) && Number(rawPage) <= MAX_PAGE ? Number(rawPage) : 1;
  return { q, type, page };
}
