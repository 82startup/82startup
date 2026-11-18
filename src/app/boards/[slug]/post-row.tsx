import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { boardImagePublicUrl } from "@/lib/boards/images";
import type { BoardPostRow } from "@/lib/boards/types";

// One post as one line of the board list: a small picture, the title with who wrote it, and the date and comment count.
export function PostRow({ post, slug }: { post: BoardPostRow; slug: string }) {
  const meta = [post.author_name, post.author_job_title, post.author_company].filter(Boolean).join(" · ");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const cover = post.images[0] ? boardImagePublicUrl(base, post.images[0]) : null;
  const comments = post.comment_count === 1 ? copy.boards.commentsCountOne : copy.boards.commentsCount.replace("{n}", String(post.comment_count));
  return (
    <li className="board-row">
      <Link href={`/boards/${slug}/${post.id}`} className="board-row-link">
        <span className="board-row-thumb" aria-hidden="true">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured
            <img src={cover} alt="" loading="lazy" />
          )}
        </span>
        <span className="board-row-main">
          <span className="board-row-title">{post.title}</span>
          <span className="board-row-meta">{meta}</span>
        </span>
        <span className="board-row-side">
          <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
          <span className="board-row-count">{comments}</span>
        </span>
      </Link>
    </li>
  );
}
