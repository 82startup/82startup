import { Suspense } from "react";
import { copy } from "@/lib/copy";
import { MemberDetailContent } from "./member-detail-content";

export default function MemberPage({ params }: PageProps<"/members/[id]">) {
  return (
    <main className="member-direct-page mx-auto w-full p-6">
      <Suspense fallback={<p>{copy.members.loading}</p>}>
        <MemberDetailContent params={params} showBack />
      </Suspense>
    </main>
  );
}
