import { useEffect } from "react";
import "./SettingsModal.css";

export default function SettingsModal({
  open,
  onClose,
  currentUserId,
  baseUrl,
  theme,
  onThemeChange,
  chatWallpaper,
  onChatWallpaperChange,
  onLogout,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-modal" role="dialog" aria-modal="true">
      <button 
        className="settings-modal__backdrop" 
        onClick={onClose} 
        aria-label="Close settings" 
      />
      <div className="settings-modal__panel">
        <div className="settings-modal__header">
          <div>
            <p className="settings-modal__eyebrow">User Settings</p>
            <h3>Settings</h3>
          </div>
          <button 
            type="button" 
            className="settings-modal__close-btn" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="settings-modal__body">
          {/* Appearance Section */}
          <section className="settings-section">
            <h4 className="settings-section__title">Appearance</h4>
            <div className="settings-row">
              <div className="settings-row__info">
                <strong>Dark Theme</strong>
                <span>Toggle between light and dark visual themes.</span>
              </div>
              <div className="theme-toggle" role="group" aria-label="Theme">
                <button
                  type="button"
                  className={`theme-toggle__btn ${theme === "dark" ? "theme-toggle__btn--on" : ""}`}
                  aria-pressed={theme === "dark"}
                  onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
                  title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                >
                  <span className="theme-toggle__knob" />
                </button>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-row__info">
                <strong>Chat Wallpaper</strong>
                <span>Pick a background color for the message area.</span>
              </div>
              <div className="wallpaper-controls">
                <input
                  type="color"
                  className="wallpaper-picker"
                  value={chatWallpaper || (theme === "dark" ? "#0c0c12" : "#edf0f5")}
                  onChange={(e) => onChatWallpaperChange(e.target.value)}
                  title="Pick wallpaper color"
                />
                {chatWallpaper ? (
                  <button
                    type="button"
                    className="wallpaper-reset-btn"
                    onClick={() => onChatWallpaperChange("")}
                    title="Reset to default"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section className="settings-section">
            <h4 className="settings-section__title">Account</h4>
            <div className="settings-field">
              <label htmlFor="settings-username">Username</label>
              <input
                id="settings-username"
                type="text"
                value={currentUserId || ""}
                readOnly
                className="settings-input--readonly"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-homeserver">Homeserver</label>
              <input
                id="settings-homeserver"
                type="text"
                value={baseUrl || ""}
                readOnly
                className="settings-input--readonly"
              />
            </div>
          </section>

          {/* Session Section */}
          <section className="settings-section">
            <h4 className="settings-section__title">Session</h4>
            <div className="settings-row">
              <div className="settings-row__info">
                <strong>Sign Out</strong>
                <span>Disconnect from this homeserver and clear active session.</span>
              </div>
              <button
                type="button"
                className="destructive-button"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
