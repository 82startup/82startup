import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { getAdmin } from "@/lib/admin/guard";
import { ADMIN_MEMBERS_PAGE_SIZE, directoryLabel, formatDate } from "@/lib/admin/members";
import { copy } from "@/lib/copy";
import { parseMemberSearch } from "@/lib/members/search";
import type { MemberType } from "@/lib/profile/schema";
import { AdminNav } from "../admin-nav";

export default function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  // Nothing about the screen is in the static shell: a non-admin must not learn it exists.
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p>{copy.admin.members.loading}</p>}>
        <AdminMembersContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Row = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  member_type: MemberType | null;
  directory: string;
  joined_at: string;
  last_sign_in_at: string | null;
  total: number | string;
};

function pageHref(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/members?${qs}` : "/admin/members";
}

async function AdminMembersContent({ searchParams }: { searchParams: PageProps<"/admin/members">["searchParams"] }) {
  await connection();
  const { supabase, check } = await getAdmin();
  if (check.status === "logged-out") redirect("/login?next=/admin/members");
  if (check.status !== "admin") notFound();

  const { q, page } = parseMemberSearch(await searchParams);
  const { data, error } = await supabase.rpc("admin_members", {
    p_query: q || null,
    p_limit: ADMIN_MEMBERS_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_MEMBERS_PAGE_SIZE,
  });
  if (error) throw new Error("could not load members");

  const rows = (data ?? []) as Row[];
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  const lastPage = Math.max(1, Math.ceil(total / ADMIN_MEMBERS_PAGE_SIZE));

  return (
    <>
      <AdminNav current="members" />
      <h1 className="mb-1 text-2xl font-semibold">{copy.admin.members.title}</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{total} {copy.admin.members.total}</p>
      <form method="get" action="/admin/members" className="mb-6 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
          {copy.admin.members.search}
          <input name="q" defaultValue={q} maxLength={80} className="rounded border p-2 font-normal" />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">{copy.admin.members.submit}</button>
        {q && <Link href="/admin/members" className="px-2 py-2 underline">{copy.admin.members.clear}</Link>}
      </form>

      {rows.length === 0 ? (
        <p>{copy.admin.members.empty}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 rounded border p-3">
                <Link href={`/members/${m.id}`} className="font-semibold underline">{m.name || copy.admin.members.noName}</Link>
                <span className="break-all text-sm">{m.email}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {copy.admin.members.role[m.role]} · {m.member_type ? copy.profile.types[m.member_type] : "—"} · {copy.admin.members.directoryTitle}: {directoryLabel(m.directory)}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {copy.admin.members.joined} {formatDate(m.joined_at)} · {copy.admin.members.lastSignIn}{" "}
                  {m.last_sign_in_at ? formatDate(m.last_sign_in_at) : copy.admin.members.never}
                </span>
              </li>
            ))}
          </ul>
          {lastPage > 1 && (
            <nav className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? <Link href={pageHref(q, page - 1)} className="underline">{copy.admin.members.previous}</Link> : <span />}
              <span>{page} / {lastPage}</span>
              {page < lastPage ? <Link href={pageHref(q, page + 1)} className="underline">{copy.admin.members.next}</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </>
  );
}
