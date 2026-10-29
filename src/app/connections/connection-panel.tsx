import Link from "next/link";
import { copy } from "@/lib/copy";
import { blockMember, cancelRequest, disconnect, respondToRequest, unblockMember } from "./actions";
import { ActionForm } from "./action-form";
import { ConnectDialog } from "./connect-dialog";

type Props = {
  memberId: string;
  name: string; // shown in the Connect popup
  state: string; // from connection_state()
  connectionId: string | null; // the open request, for sent and received
  note: string; // the note on a received request
};

// The connect controls on another member's profile. Nothing on your own, or when the member is unavailable.
export function ConnectionPanel({ memberId, name, state, connectionId, note }: Props) {
  if (state === "self" || state === "unavailable") return null;
  const member = { member: memberId };

  if (state === "blocked") {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-sm">{copy.connections.blocked}</p>
        <ActionForm action={unblockMember} fields={member} label={copy.connections.unblock} />
      </section>
    );
  }

  return (
    <section className="member-connection-panel flex flex-col gap-3">
      {state === "none" && <ConnectDialog memberId={memberId} name={name || copy.attendance.member} />}
      {state === "sent" && (
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy.connections.requestSent}</span>
          {connectionId && <ActionForm action={cancelRequest} fields={{ id: connectionId }} label={copy.connections.cancel} quiet />}
        </div>
      )}
      {state === "received" && (
        <div className="flex flex-col gap-2">
          {note && <p className="whitespace-pre-line text-sm"><span className="text-zinc-600 dark:text-zinc-400">{copy.connections.noteFrom}: </span>{note}</p>}
          {connectionId && (
            <div className="flex flex-wrap gap-3">
              <ActionForm action={respondToRequest} fields={{ id: connectionId, value: "true" }} label={copy.connections.accept} />
              <ActionForm action={respondToRequest} fields={{ id: connectionId, value: "false" }} label={copy.connections.decline} />
            </div>
          )}
        </div>
      )}
      {state === "connected" && (
        <div className="flex flex-wrap items-center gap-3">
          <span>{copy.connections.connected}</span>
          <Link href={`/messages/${memberId}`} className="rounded border px-3 py-1 text-sm">{copy.messages.message}</Link>
          <ActionForm action={disconnect} fields={member} label={copy.connections.disconnect} quiet />
        </div>
      )}
      <ActionForm action={blockMember} fields={member} label={copy.connections.block} quiet />
    </section>
  );
}
