import RoomItem from "./RoomItem";
import {
  getRoomDisplayName,
  getRoomLastMessagePreview,
  getRoomUnreadCount,
} from "../services/matrixClient";

function Sidebar({ rooms, selectedRoomId, onSelectRoom, onLogout, currentUserId, status }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <p className="eyebrow">Matrix rooms</p>
        <h1>Inbox</h1>
        <p className="sidebar__meta">
          {status === "ready" ? "Connected" : "Loading"} {currentUserId ? `as ${currentUserId}` : ""}
        </p>
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
              lastMessagePreview={getRoomLastMessagePreview(room, currentUserId)}
              unreadCount={room.roomId === selectedRoomId ? 0 : getRoomUnreadCount(room)}
              active={room.roomId === selectedRoomId}
              onClick={() => onSelectRoom(room)}
            />
          ))
        )}
      </div>

      <div className="sidebar__footer">
        <button type="button" className="sidebar__logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
