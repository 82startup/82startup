export type BoardSummary = { slug: string; title: string; description: string };

type Author = {
  author_id: string;
  author_name: string;
  author_job_title: string;
  author_company: string;
  author_avatar: string | null;
};

export type BoardPostRow = Author & {
  id: string;
  title: string;
  body: string;
  images: string[];
  comment_count: number;
  created_at: string;
  can_delete: boolean;
};

export type BoardCommentRow = Author & {
  id: string;
  body: string;
  created_at: string;
  can_delete: boolean;
};
