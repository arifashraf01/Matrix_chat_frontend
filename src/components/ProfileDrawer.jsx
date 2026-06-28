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
            {profile.isGroup ? (
              <>
                <div className="profile-drawer__field">
                  <dt>Members</dt>
                  <dd>{profile.memberCount} total</dd>
                </div>
                <div className="profile-drawer__field">
                  <dt>Room</dt>
                  <dd>{roomName}</dd>
                </div>
                <div className="profile-drawer__members-list" style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>Member List</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profile.members.map((m) => (
                      <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="profile-drawer__avatar" style={{ width: 32, height: 32, minWidth: 32, ...(m.avatarUrl ? {} : { backgroundColor: getAvatarBackground(m.displayName) }) }}>
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt="" className="profile-drawer__avatar-image" />
                          ) : (
                            <span className="profile-drawer__avatar-letter" style={{ fontSize: '1rem' }}>{m.avatarInitial}</span>
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.875rem' }}>{m.displayName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{m.userId}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </dl>
        </div>
      </aside>
    </div>
  );
}

export default ProfileDrawer;
