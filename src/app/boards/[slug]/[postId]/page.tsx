import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { boardImagePublicUrl } from "@/lib/boards/images";
import { getBoardPost, markBoardPostSeen, requireViewer } from "@/lib/boards/queries";
import { RichText } from "@/lib/boards/rich-text";
import { Comments } from "./comments";
import { DeletePostButton } from "./delete-post-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default function BoardPostPage({ params }: PageProps<"/boards/[slug]/[postId]">) {
  return (
    <main className="board-post-page">
      <Suspense fallback={<p className="settings-intro">{copy.boards.loading}</p>}>
        <PostContent params={params} />
      </Suspense>
    </main>
  );
}

async function PostContent({ params }: { params: PageProps<"/boards/[slug]/[postId]">["params"] }) {
  await connection();
  const { slug, postId } = await params;
  if (!UUID.test(postId)) notFound();
  const viewer = await requireViewer(`/boards/${slug}/${postId}`);
  const post = await getBoardPost(postId);
  if (!post) notFound();
  // The author opening their post clears its new-comment badge in the sidebar.
  if (post.author_id === viewer) await markBoardPostSeen(post.id);

  const detail = [post.author_job_title, post.author_company].filter(Boolean).join(" · ");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const images = post.images.map((path) => boardImagePublicUrl(base, path)).filter((url): url is string => url !== null);
  return (
    <>
      <Link className="action-quiet board-back" href={`/boards/${slug}`}>← {copy.boards.back}</Link>
      <article className="board-article">
        <header className="board-article-head">
          <h1>{post.title}</h1>
          <div className="board-article-byline">
            <Link href={`/members/${post.author_id}`} className="board-card-author">
              <Avatar name={post.author_name} url={post.author_avatar} size={40} />
              <span className="board-card-author-copy">
                <span className="board-card-author-name">{post.author_name}</span>
                {detail && <span className="board-card-author-detail">{detail}</span>}
              </span>
            </Link>
            <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
          </div>
        </header>
        {images.length > 0 && (
          <div className="board-article-images" data-count={Math.min(images.length, 4)}>
            {images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured
              <img key={url} src={url} alt="" loading="lazy" />
            ))}
          </div>
        )}
        <p className="board-article-body"><RichText text={post.body} /></p>
        {(post.can_edit || post.can_delete) && (
          <footer className="board-article-foot">
            {post.can_edit && (
              <Link className="action-quiet" href={`/boards/${slug}/${post.id}/edit`}>{copy.boards.edit}</Link>
            )}
            {post.can_delete && <DeletePostButton slug={slug} postId={post.id} />}
          </footer>
        )}
      </article>
      <Comments slug={slug} postId={post.id} />
    </>
  );
}
