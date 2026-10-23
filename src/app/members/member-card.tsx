import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import type { MemberType } from "@/lib/profile/schema";

export type MemberRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  job_title: string;
  company_name: string;
  member_type: MemberType | null;
};

export function MemberCard({ member }: { member: MemberRow }) {
  const detail = [member.job_title, member.company_name].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={`/members/${member.id}`} className="flex items-center gap-3 rounded border p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
        <Avatar name={member.name} url={member.avatar_url} />
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold">{member.name}</span>
          {detail && <span className="text-sm text-zinc-600 dark:text-zinc-400">{detail}</span>}
          {member.member_type && <span className="text-xs text-zinc-600 dark:text-zinc-400">{copy.profile.types[member.member_type]}</span>}
        </div>
      </Link>
    </li>
  );
}
