import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { BOARD_PAGE_SIZE, getBoardPosts, getBoards, requireViewer } from "@/lib/boards/queries";
import { PostRow } from "./post-row";

export default function BoardPage({ params, searchParams }: PageProps<"/boards/[slug]">) {
  return (
    <main className="boards-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <BoardContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// ?before=<time of the last post shown>: the next older page. Anything that is not a date means the newest page.
function parseBefore(value: string | string[] | undefined): string | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || Number.isNaN(Date.parse(text))) return null;
  return new Date(text).toISOString();
}

async function BoardContent({ params, searchParams }: { params: PageProps<"/boards/[slug]">["params"]; searchParams: PageProps<"/boards/[slug]">["searchParams"] }) {
  await connection();
  const { slug } = await params;
  await requireViewer(`/boards/${slug}`);
  const before = parseBefore((await searchParams).before);

  const [boards, posts] = await Promise.all([getBoards(), getBoardPosts(slug, before)]);
  const board = boards.find((candidate) => candidate.slug === slug);
  if (!board) notFound();

  const last = posts[posts.length - 1];
  return (
    <>
      <header className="board-head">
        <div>
          <h1>{board.title}</h1>
          {board.description && <p>{board.description}</p>}
        </div>
        <Link className="community-action" href={`/boards/${slug}/new`}>{copy.boards.newPost}</Link>
      </header>
      {posts.length === 0 ? (
        <p className="settings-intro">{copy.boards.empty}</p>
      ) : (
        <ul className="board-posts">
          {posts.map((post) => <PostRow key={post.id} post={post} slug={slug} />)}
        </ul>
      )}
      <nav className="board-pager" aria-label="Pages">
        {before && <Link className="action-quiet" href={`/boards/${slug}`}>{copy.boards.newestPosts}</Link>}
        {posts.length === BOARD_PAGE_SIZE && last && (
          <Link className="community-action community-action-secondary" href={`/boards/${slug}?before=${encodeURIComponent(last.created_at)}`}>{copy.boards.olderPosts}</Link>
        )}
      </nav>
    </>
  );
}
