import Link from "next/link";
import { copy } from "@/lib/copy";
import { blockMember, cancelRequest, disconnect, respondToRequest, unblockMember } from "./actions";
import { ActionForm } from "./action-form";
import { ConnectDialog } from "./connect-dialog";
import { MoreMenu } from "./more-menu";

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
      <section className="member-connection-panel">
        <p className="member-connection-status">{copy.connections.blocked}</p>
        <ActionForm action={unblockMember} fields={member} label={copy.connections.unblock} />
      </section>
    );
  }

  return (
    <section className="member-connection-panel">
      {state === "none" && <ConnectDialog memberId={memberId} name={name || copy.attendance.member} />}
      {state === "sent" && (
        <div className="member-connection-actions">
          <span className="member-connection-status">{copy.connections.requestSent}</span>
          {connectionId && <ActionForm action={cancelRequest} fields={{ id: connectionId }} label={copy.connections.cancel} quiet />}
        </div>
      )}
      {state === "received" && (
        <div className="member-connection-received">
          {note && <p className="connection-note"><span>{copy.connections.noteFrom}</span>{note}</p>}
          {connectionId && (
            <div className="member-connection-actions">
              <ActionForm action={respondToRequest} fields={{ id: connectionId, value: "true" }} label={copy.connections.accept} />
              <ActionForm action={respondToRequest} fields={{ id: connectionId, value: "false" }} label={copy.connections.decline} secondary />
            </div>
          )}
        </div>
      )}
      {state === "connected" && (
        <div className="member-connection-actions">
          <span className="member-connection-status">{copy.connections.connected}</span>
          <Link href={`/messages/${memberId}`} className="community-action">{copy.messages.message}</Link>
        </div>
      )}
      <div className="member-connection-secondary">
        <MoreMenu label={copy.connections.more}>
          {state === "connected" && <ActionForm action={disconnect} fields={member} label={copy.connections.disconnect} quiet />}
          <ActionForm action={blockMember} fields={member} label={copy.connections.block} quiet />
        </MoreMenu>
      </div>
    </section>
  );
}
