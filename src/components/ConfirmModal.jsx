import { useEffect } from "react";

function ConfirmModal({ open, title, message, onCancel, onConfirm, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="image-modal" role="dialog" aria-modal="true">
      <button className="image-modal__backdrop" onClick={onCancel} />
      <div className="image-modal__panel" style={{ width: 420 }}>
        <div className="image-modal__header">
          <div>
            <p className="image-modal__eyebrow">{title}</p>
            <h3>{title}</h3>
          </div>
          <div>
            <button type="button" className="image-modal__close" onClick={onCancel}>Close</button>
          </div>
        </div>

        <div className="image-modal__body" style={{ padding: 20 }}>
          <p style={{ marginBottom: 18 }}>{message}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" className="secondary-button" onClick={onCancel}>{cancelLabel}</button>
            <button type="button" className="primary-button" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
