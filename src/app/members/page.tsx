import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { PAGE_SIZE, parseMemberSearch } from "@/lib/members/search";
import { MEMBER_TYPES } from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";
import { MemberCard, type MemberRow } from "./member-card";

export default function MembersPage({ searchParams }: PageProps<"/members">) {
  return (
    <main className="members-page mx-auto w-full p-6">
      <Suspense fallback={<p>{copy.members.loading}</p>}>
        <MembersContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function pageHref(q: string, type: string | null, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/members?${qs}` : "/members";
}

async function MembersContent({ searchParams }: { searchParams: PageProps<"/members">["searchParams"] }) {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/login?next=/members");

  const { q, type, page } = parseMemberSearch(await searchParams);
  const { data, error } = await supabase.rpc("search_members", {
    p_query: q || null,
    p_type: type,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as (MemberRow & { total: number | string })[];
  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || type);

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">{copy.members.title}</h1>
      <form method="get" action="/members" className="member-filters">
        <label className="member-filter-field member-search-field">
          <span>{copy.members.search}</span>
          <input name="q" defaultValue={q} maxLength={80} className="font-normal" />
        </label>
        <label className="member-filter-field member-type-filter">
          <span>{copy.members.type}</span>
          <span className="member-select-control">
            <select name="type" defaultValue={type ?? ""} className="font-normal">
              <option value="">{copy.members.allTypes}</option>
              {MEMBER_TYPES.map((t) => (
                <option key={t} value={t}>{copy.profile.types[t]}</option>
              ))}
            </select>
          </span>
        </label>
        <button type="submit" className="member-filter-submit">{copy.members.submit}</button>
        {filtered && <Link href="/members" className="member-filter-clear">{copy.members.clear}</Link>}
      </form>

      {rows.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p>{filtered || page > 1 ? copy.members.emptyResults : copy.members.emptyDirectory}</p>
          {page > 1 && <Link href={pageHref(q, type, 1)} className="underline">{copy.members.backToFirst}</Link>}
        </div>
      ) : (
        <>
          <ul className="members-grid">
            {rows.map((member) => <MemberCard key={member.id} member={member} />)}
          </ul>
          {lastPage > 1 && (
            <nav className="mt-6 flex items-center justify-between text-sm">
              {page > 1 ? <Link href={pageHref(q, type, page - 1)} className="underline">{copy.members.previous}</Link> : <span />}
              <span>{page} / {lastPage}</span>
              {page < lastPage ? <Link href={pageHref(q, type, page + 1)} className="underline">{copy.members.next}</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </>
  );
}
