import { Suspense } from "react";
import { copy } from "@/lib/copy";
import { parseUnsubscribeParams } from "@/lib/notifications/form";
import { UnsubscribeForm } from "./unsubscribe-form";

// Public (no sign-in): the private code in the email's link is what identifies the member.
export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{copy.unsubscribe.title}</h1>
      <Suspense>
        <UnsubscribeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UnsubscribeContent({ searchParams }: { searchParams: PageProps<"/unsubscribe">["searchParams"] }) {
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);
  const parsed = parseUnsubscribeParams(one(query.code), one(query.kind));
  return parsed ? <UnsubscribeForm code={parsed.code} kind={parsed.kind} /> : <p>{copy.unsubscribe.invalid}</p>;
}
