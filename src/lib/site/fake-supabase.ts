// A small stand-in for the Supabase client in tests: every chained call is recorded, and awaiting the chain gives the result set for that table and operation.
type Result = { data?: unknown; error?: unknown };
export type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

export function fakeSupabase(results: Record<string, Result> = {}) {
  const calls: Call[] = [];
  const uploads: { path: string; type: string | undefined }[] = [];
  const removed: string[][] = [];
  const storageResults = { upload: results["storage:upload"] ?? { error: null } };

  function chain(table: string) {
    const call: Call = { table, op: "select", filters: [] };
    const settle = () => {
      calls.push(call);
      return Promise.resolve(results[`${table}:${call.op}`] ?? { data: null, error: null });
    };
    const b = {
      select: () => b,
      order: () => b,
      limit: () => b,
      eq: (column: string, value: unknown) => {
        call.filters.push([column, value]);
        return b;
      },
      insert: (payload: unknown) => {
        call.op = "insert";
        call.payload = payload;
        return b;
      },
      update: (payload: unknown) => {
        call.op = "update";
        call.payload = payload;
        return b;
      },
      upsert: (payload: unknown) => {
        call.op = "upsert";
        call.payload = payload;
        return b;
      },
      delete: () => {
        call.op = "delete";
        return b;
      },
      maybeSingle: settle,
      single: settle,
      then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => settle().then(ok, fail),
    };
    return b;
  }

  const rpcCalls: { name: string; args: unknown }[] = [];
  const supabase = {
    from: (table: string) => chain(table),
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return results[`rpc:${name}`] ?? { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, _body: unknown, options?: { contentType?: string }) => {
          uploads.push({ path, type: options?.contentType });
          return storageResults.upload;
        },
        remove: async (paths: string[]) => {
          removed.push(paths);
          return { error: null };
        },
      }),
    },
  };
  return { supabase, calls, uploads, removed, rpcCalls };
}
