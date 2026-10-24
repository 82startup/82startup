// "{n} connections", or the singular text for exactly one. A plain module, so server and client code can both use it.
export function countText(plural: string, singular: string, n: number): string {
  return n === 1 ? singular : plural.replace("{n}", String(n));
}
