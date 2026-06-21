function RoomItem({ roomName, lastMessagePreview, unreadCount, active, onClick }) {
  const badgeLabel =
    unreadCount >= 9 ? "9+" : unreadCount > 0 ? `${unreadCount}` : "";

  return (
    <button
      type="button"
      className={`room-item${active ? " room-item--active" : ""}`}
      onClick={onClick}
      aria-current={active ? "true" : "false"}
    >
      <span className="room-item__toprow">
        <span className="room-item__name">{roomName}</span>
        {badgeLabel ? <span className="room-item__badge">{badgeLabel}</span> : null}
      </span>
      {lastMessagePreview ? <span className="room-item__preview">{lastMessagePreview}</span> : null}
    </button>
  );
}

export default RoomItem;
