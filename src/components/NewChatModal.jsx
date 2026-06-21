import { useEffect, useState } from "react";

function isValidMatrixId(value) {
  if (!value || typeof value !== "string") return false;
  // basic validation: @localpart:domain
  return /^@[A-Za-z0-9._=\-]+:[A-Za-z0-9.\-]+$/u.test(value.trim());
}

function NewChatModal({ open, onClose, onCreateOrOpen }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");

    const userId = value.trim();
    if (!isValidMatrixId(userId)) {
      setError("Please enter a valid Matrix user id (e.g. @alice:matrix.org).");
      return;
    }

    setLoading(true);
    try {
      await onCreateOrOpen(userId);
    } catch (err) {
      setError(err?.message || "Failed to create or open chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-modal" role="dialog" aria-modal="true">
      <button className="image-modal__backdrop" onClick={onClose} />
      <div className="image-modal__panel" style={{ width: 520 }}>
        <div className="image-modal__header">
          <div>
            <p className="image-modal__eyebrow">New Chat</p>
            <h3>Start a direct message</h3>
          </div>
          <div>
            <button type="button" className="image-modal__close" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="image-modal__body" style={{ padding: 20 }}>
          <form onSubmit={submit} style={{ width: "100%" }}>
            <label style={{ display: "block", marginBottom: 8, color: "var(--muted)" }}>Search Matrix User</label>
            <input
              autoFocus
              placeholder="@alice:matrix.org"
              className="message-input__field"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />

            {error ? (
              <div style={{ color: "#fca5a5", marginBottom: 12 }}>{error}</div>
            ) : null}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" className="message-input__button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? "Opening…" : "Start Chat"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NewChatModal;
