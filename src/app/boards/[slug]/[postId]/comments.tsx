import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { getBoardComments } from "@/lib/boards/queries";
import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";

export async function Comments({ slug, postId }: { slug: string; postId: string }) {
  const comments = await getBoardComments(postId);
  return (
    <section className="board-comments" aria-label={copy.boards.comments.title}>
      <h2>{copy.boards.comments.title}</h2>
      {comments.length === 0 ? (
        <p className="settings-intro">{copy.boards.comments.none}</p>
      ) : (
        <ul className="board-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="board-comment">
              <Link href={`/members/${comment.author_id}`} className="board-comment-avatar" aria-label={comment.author_name}>
                <Avatar name={comment.author_name} url={comment.author_avatar} size={36} />
              </Link>
              <div className="board-comment-main">
                <div className="board-comment-meta">
                  <Link href={`/members/${comment.author_id}`}>{comment.author_name}</Link>
                  <time dateTime={comment.created_at}>{formatPostDate(comment.created_at)}</time>
                  {comment.can_delete && <DeleteCommentButton slug={slug} postId={postId} commentId={comment.id} />}
                </div>
                <p>{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CommentForm slug={slug} postId={postId} />
    </section>
  );
}
