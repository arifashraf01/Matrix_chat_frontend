import RoomItem from "./RoomItem";
import {
  getRoomDisplayName,
  getRoomLastMessageMeta,
  getRoomInitial,
  getRoomUnreadCount,
} from "../services/matrixClient";

function Sidebar({ rooms, selectedRoomId, onSelectRoom, onLogout, currentUserId, status, theme = "light", onThemeChange = () => {}, onOpenNewChat = () => {} }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <p className="eyebrow">Matrix rooms</p>
        <h1>Inbox</h1>
        <p className="sidebar__meta">{status === "ready" ? "Connected" : "Loading"}</p>
      </div>

      <div style={{ padding: "8px 12px 0 12px" }}>
        <button
          type="button"
          className="primary-button"
          onClick={() => onOpenNewChat()}
          style={{ width: "100%", borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}
        >
          New Chat
        </button>
      </div>

      <div className="sidebar__list" role="list" aria-label="Matrix rooms">
        {rooms.length === 0 ? (
          <div className="sidebar__empty">
            <h2>No rooms yet</h2>
            <p>Once Matrix sync completes, rooms will appear here.</p>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomItem
              key={room.roomId}
              roomName={getRoomDisplayName(room)}
              roomInitial={getRoomInitial(getRoomDisplayName(room))}
              {...getRoomLastMessageMeta(room, currentUserId)}
              unreadCount={room.roomId === selectedRoomId ? 0 : getRoomUnreadCount(room)}
              active={room.roomId === selectedRoomId}
              onClick={() => onSelectRoom(room)}
            />
          ))
        )}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__footer-actions">
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

          <button type="button" className="sidebar__logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
