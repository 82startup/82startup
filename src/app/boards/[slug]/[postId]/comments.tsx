import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { formatPostDate } from "@/lib/boards/format";
import { getBoardComments } from "@/lib/boards/queries";
import { CommentBody } from "./comment-body";
import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";

export async function Comments({ slug, postId }: { slug: string; postId: string }) {
  const comments = await getBoardComments(postId);
  return (
    <section className="board-comments" aria-label={copy.boards.comments.title}>
      <h2>{copy.boards.comments.title}{comments.length > 0 && <span>{comments.length}</span>}</h2>
      {comments.length === 0 ? (
        <p className="board-comments-empty">{copy.boards.comments.none}</p>
      ) : (
        <ul className="board-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="board-comment">
              <Link href={`/members/${comment.author_id}`} className="board-comment-avatar" aria-label={comment.author_name}>
                <Avatar name={comment.author_name} url={comment.author_avatar} size={36} />
              </Link>
              <CommentBody
                slug={slug}
                postId={postId}
                commentId={comment.id}
                body={comment.body}
                canEdit={comment.can_edit}
                meta={
                  <>
                    <Link href={`/members/${comment.author_id}`}>{comment.author_name}</Link>
                    <time dateTime={comment.created_at}>{formatPostDate(comment.created_at)}</time>
                  </>
                }
                deleteButton={comment.can_delete ? <DeleteCommentButton slug={slug} postId={postId} commentId={comment.id} /> : null}
              />
            </li>
          ))}
        </ul>
      )}
      <CommentForm slug={slug} postId={postId} />
    </section>
  );
}
