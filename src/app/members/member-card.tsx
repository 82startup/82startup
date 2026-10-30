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

export function MemberCard({ member, self = false }: { member: MemberRow; self?: boolean }) {
  const detail = [member.job_title, member.company_name].filter(Boolean).join(" · ");
  return (
    <li className={self ? "members-grid-self" : undefined}>
      <Link href={`/members/${member.id}`} className="member-card" data-self={self || undefined} aria-label={self ? `${member.name} (${copy.members.you})` : undefined}>
        <Avatar name={member.name} url={member.avatar_url} />
        <div className="member-card-copy">
          <span className="member-card-name">{member.name}{self && <span className="member-card-you">{copy.members.you}</span>}</span>
          {detail && <span className="member-card-detail">{detail}</span>}
        </div>
        {member.member_type && <span className="member-type-tag" data-type={member.member_type}>{copy.profile.types[member.member_type]}</span>}
      </Link>
    </li>
  );
}
