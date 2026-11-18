import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { boardImagePublicUrl } from "@/lib/boards/images";
import { getBoardPost, requireViewer } from "@/lib/boards/queries";
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
  await requireViewer(`/boards/${slug}/${postId}`);
  const post = await getBoardPost(postId);
  if (!post) notFound();

  const detail = [post.author_job_title, post.author_company].filter(Boolean).join(" · ");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const images = post.images.map((path) => boardImagePublicUrl(base, path)).filter((url): url is string => url !== null);
  return (
    <>
      <Link className="action-quiet board-back" href={`/boards/${slug}`}>← {copy.boards.back}</Link>
      <article className="board-article">
        <header className="board-article-head">
          <Link href={`/members/${post.author_id}`} className="board-card-author">
            <Avatar name={post.author_name} url={post.author_avatar} size={44} />
            <span className="board-card-author-copy">
              <span className="board-card-author-name">{post.author_name}</span>
              {detail && <span className="board-card-author-detail">{detail}</span>}
            </span>
            <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
          </Link>
          <h1>{post.title}</h1>
        </header>
        <p className="board-article-body">{post.body}</p>
        {images.length > 0 && (
          <div className="board-article-images">
            {images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured
              <img key={url} src={url} alt="" loading="lazy" />
            ))}
          </div>
        )}
        {post.can_delete && (
          <footer className="board-article-foot">
            <DeletePostButton slug={slug} postId={post.id} />
          </footer>
        )}
      </article>
      <Comments slug={slug} postId={post.id} />
    </>
  );
}
