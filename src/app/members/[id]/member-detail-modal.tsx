"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function MemberDetailModal({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const element = dialog.current;
    if (element?.open) element.close();
    element?.showModal();
    return () => dialog.current?.close();
  }, []);

  function close() {
    router.back();
  }

  return (
    <dialog
      ref={dialog}
      className="member-detail-modal"
      aria-label="Member profile"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialog.current) close(); }}
    >
      <header className="member-detail-modal-header">
        <span>MEMBER PROFILE</span>
        <button type="button" onClick={close} aria-label="Close profile" autoFocus>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div className="member-detail-modal-body">{children}</div>
    </dialog>
  );
}
