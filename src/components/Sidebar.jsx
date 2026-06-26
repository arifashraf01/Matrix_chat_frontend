import RoomItem from "./RoomItem";
import {
  getRoomDisplayName,
  getRoomLastMessageMeta,
  getRoomInitial,
  getRoomUnreadCount,
} from "../services/matrixClient";

function Sidebar({ rooms, selectedRoomId, onSelectRoom, currentUserId, status, onOpenNewChat = () => {}, onOpenSettings = () => {} }) {
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
        <button
          type="button"
          className="sidebar__settings-btn"
          onClick={onOpenSettings}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
