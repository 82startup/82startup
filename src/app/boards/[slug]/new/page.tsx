import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getBoards, requireViewer } from "@/lib/boards/queries";
import { PostForm } from "../../post-form";

export default function NewBoardPostPage({ params }: PageProps<"/boards/[slug]/new">) {
  return (
    <main className="board-new-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <NewPostContent params={params} />
      </Suspense>
    </main>
  );
}

async function NewPostContent({ params }: { params: PageProps<"/boards/[slug]/new">["params"] }) {
  await connection();
  const { slug } = await params;
  const userId = await requireViewer(`/boards/${slug}/new`);
  const board = (await getBoards()).find((candidate) => candidate.slug === slug);
  if (!board) notFound();
  return (
    <>
      <header className="board-head">
        <div>
          <h1>{copy.boards.newPost}</h1>
          <p>{board.title}</p>
        </div>
      </header>
      <PostForm mode="create" slug={slug} userId={userId} />
    </>
  );
}
