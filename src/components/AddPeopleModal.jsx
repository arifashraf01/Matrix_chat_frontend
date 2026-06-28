import { useEffect, useState } from "react";

function isValidMatrixId(value) {
  if (!value || typeof value !== "string") return false;
  return /^@[A-Za-z0-9._=\-]+:[A-Za-z0-9.\-]+$/u.test(value.trim());
}

function AddPeopleModal({ open, onClose, onInvite }) {
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
      await onInvite(userId);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to invite user. Please try again.");
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
            <p className="image-modal__eyebrow">Add People</p>
            <h3>Invite a user to this room</h3>
          </div>
          <div>
            <button type="button" className="image-modal__close" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="image-modal__body" style={{ padding: 20 }}>
          <form onSubmit={submit} style={{ width: "100%" }}>
            <label style={{ display: "block", marginBottom: 8, color: "var(--muted)" }}>Matrix User ID</label>
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
              <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? "Inviting…" : "Invite"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddPeopleModal;
