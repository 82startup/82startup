import { copy } from "@/lib/copy";

// With no conversation open, the right pane invites picking one from the list.
export default function MessagesPage() {
  return (
    <div className="messages-placeholder">
      <span className="messages-placeholder-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5.2A8.5 8.5 0 1 1 21 12Z" /></svg>
      </span>
      <h2>{copy.messages.pickTitle}</h2>
      <p>{copy.messages.pickText}</p>
    </div>
  );
}
