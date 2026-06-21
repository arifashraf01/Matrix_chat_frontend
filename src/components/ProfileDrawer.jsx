import { useEffect } from "react";

const AVATAR_COLORS = ["#FDE2E4", "#E2EAFD", "#EDE9FE", "#DCFCE7", "#FEF3C7", "#FCE7F3"];

function getAvatarBackground(label = "") {
  const seed = [...label].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function ProfileDrawer({ open, profile, roomName, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !profile) {
    return null;
  }

  const avatarStyle = profile.avatarUrl ? null : { backgroundColor: getAvatarBackground(profile.displayName) };
  const initials = profile.avatarInitial || profile.displayName.charAt(0).toUpperCase();

  return (
    <div className="profile-drawer" aria-hidden={!open}>
      <button type="button" className="profile-drawer__backdrop" aria-label="Close profile drawer" onClick={onClose} />

      <aside
        className="profile-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-drawer-title"
      >
        <div className="profile-drawer__header">
          <div>
            <p className="eyebrow">Profile</p>
            <h2 id="profile-drawer-title">{profile.displayName}</h2>
          </div>

          <button type="button" className="profile-drawer__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="profile-drawer__body">
          <div className="profile-drawer__avatar" style={avatarStyle}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="profile-drawer__avatar-image" />
            ) : (
              <span className="profile-drawer__avatar-letter">{initials}</span>
            )}
          </div>

          <dl className="profile-drawer__details">
            <div className="profile-drawer__field">
              <dt>Matrix ID</dt>
              <dd>{profile.userId}</dd>
            </div>

            <div className="profile-drawer__field">
              <dt>Status</dt>
              <dd className={`profile-drawer__status profile-drawer__status--${profile.presenceTone}`}>
                {profile.presenceLabel}
              </dd>
            </div>

            <div className="profile-drawer__field">
              <dt>Last Active</dt>
              <dd>{profile.lastActiveLabel || "Unknown"}</dd>
            </div>

            <div className="profile-drawer__field">
              <dt>Room</dt>
              <dd>{roomName}</dd>
            </div>

            
          </dl>
        </div>
      </aside>
    </div>
  );
}

export default ProfileDrawer;
