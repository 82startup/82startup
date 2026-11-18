import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { formatPostDate, previewText } from "@/lib/boards/format";
import { boardImagePublicUrl } from "@/lib/boards/images";
import type { BoardPostRow } from "@/lib/boards/types";

export function PostCard({ post, slug }: { post: BoardPostRow; slug: string }) {
  const detail = [post.author_job_title, post.author_company].filter(Boolean).join(" · ");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const cover = post.images[0] ? boardImagePublicUrl(base, post.images[0]) : null;
  return (
    <li className="board-card">
      <Link href={`/members/${post.author_id}`} className="board-card-author">
        <Avatar name={post.author_name} url={post.author_avatar} size={40} />
        <span className="board-card-author-copy">
          <span className="board-card-author-name">{post.author_name}</span>
          {detail && <span className="board-card-author-detail">{detail}</span>}
        </span>
        <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
      </Link>
      <Link href={`/boards/${slug}/${post.id}`} className="board-card-body">
        <h2 className="board-card-title">{post.title}</h2>
        <p className="board-card-preview">{previewText(post.body, 280)}</p>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured
          <img className="board-card-image" src={cover} alt="" loading="lazy" />
        )}
      </Link>
    </li>
  );
}
