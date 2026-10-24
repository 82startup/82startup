import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { getAdmin } from "@/lib/admin/guard";
import { copy } from "@/lib/copy";
import { parseMemberSearch } from "@/lib/members/search";
import { ActionButton } from "../action-button";
import { AdminNav } from "../admin-nav";
import { setMemberRole } from "./actions";

const t = copy.admin.admins;
const RESULTS = 20;

export default function AdminAdminsPage({ searchParams }: PageProps<"/admin/admins">) {
  // Nothing about the screen is in the static shell: a non-admin must not learn it exists.
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p>{t.loading}</p>}>
        <AdminAdminsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type AdminRow = { id: string; name: string; email: string };
type MemberRow = { id: string; name: string; email: string; role: "member" | "admin" };

async function AdminAdminsContent({ searchParams }: { searchParams: PageProps<"/admin/admins">["searchParams"] }) {
  await connection();
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/admins");
  if (check.status !== "admin") notFound();

  const { q } = parseMemberSearch(await searchParams);
  const { data: adminData, error } = await supabase.rpc("admin_list_admins");
  if (error) throw new Error("could not load admins");
  const admins = (adminData ?? []) as AdminRow[];

  // Members to pick from: only after a search, and never someone who is already an admin.
  let found: MemberRow[] = [];
  if (q) {
    const { data } = await supabase.rpc("admin_members", { p_query: q, p_limit: RESULTS, p_offset: 0 });
    found = ((data ?? []) as MemberRow[]).filter((m) => m.role !== "admin");
  }

  return (
    <>
      <AdminNav current="admins" />
      <h1 className="mb-1 text-2xl font-semibold">{t.title}</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{t.intro}</p>

      <section className="mb-8" aria-labelledby="current-admins">
        <h2 id="current-admins" className="mb-3 font-semibold">{t.current} ({admins.length})</h2>
        <ul className="flex flex-col gap-3">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded border p-3">
              <span>
                <Link href={`/members/${a.id}`} className="font-semibold underline">{a.name || t.noName}</Link>
                {a.id === check.userId && <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">({t.you})</span>}
              </span>
              <span className="break-all text-sm">{a.email}</span>
              {a.id !== check.userId && (
                <ActionButton action={setMemberRole} fields={{ id: a.id, role: "member" }} label={t.remove} confirm={t.confirmRemove.replace("{name}", a.name || a.email)} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="add-admin">
        <h2 id="add-admin" className="mb-1 font-semibold">{t.add}</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{t.addHint}</p>
        <form method="get" action="/admin/admins" className="mb-4 flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
            {t.search}
            <input name="q" defaultValue={q} maxLength={80} className="rounded border p-2 font-normal" />
          </label>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">{t.submit}</button>
        </form>
        {q && found.length === 0 && <p className="text-sm">{t.none}</p>}
        <ul className="flex flex-col gap-3">
          {found.map((m) => (
            <li key={m.id} className="flex flex-col gap-1 rounded border p-3">
              <Link href={`/members/${m.id}`} className="font-semibold underline">{m.name || t.noName}</Link>
              <span className="break-all text-sm">{m.email}</span>
              <ActionButton action={setMemberRole} fields={{ id: m.id, role: "admin" }} label={t.make} confirm={t.confirmMake.replace("{name}", m.name || m.email)} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
