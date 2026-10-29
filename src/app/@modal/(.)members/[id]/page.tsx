import { Suspense } from "react";
import { copy } from "@/lib/copy";
import { MemberDetailContent } from "@/app/members/[id]/member-detail-content";
import { MemberDetailModal } from "@/app/members/[id]/member-detail-modal";

export default function InterceptedMemberPage({ params }: PageProps<"/members/[id]">) {
  return (
    <MemberDetailModal>
      <Suspense fallback={<p>{copy.members.loading}</p>}>
        <MemberDetailContent params={params} />
      </Suspense>
    </MemberDetailModal>
  );
}
