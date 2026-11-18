import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { copy } from "@/lib/copy";
import { getBoardPost, getBoards, requireViewer } from "@/lib/boards/queries";
import { PostForm } from "../../../post-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default function EditBoardPostPage({ params }: PageProps<"/boards/[slug]/[postId]/edit">) {
  return (
    <main className="board-new-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <EditPostContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditPostContent({ params }: { params: PageProps<"/boards/[slug]/[postId]/edit">["params"] }) {
  await connection();
  const { slug, postId } = await params;
  if (!UUID.test(postId)) notFound();
  const userId = await requireViewer(`/boards/${slug}/${postId}/edit`);
  const post = await getBoardPost(postId);
  if (!post || !post.can_edit) notFound();
  const board = (await getBoards()).find((candidate) => candidate.slug === slug);
  return (
    <>
      <header className="board-head">
        <div>
          <h1>{copy.boards.editPost}</h1>
          <p>
            <Link href={`/boards/${slug}`}>{board?.title ?? slug}</Link>
          </p>
        </div>
      </header>
      <PostForm mode="edit" slug={slug} userId={userId} initial={{ postId: post.id, title: post.title, body: post.body, images: post.images }} />
    </>
  );
}
