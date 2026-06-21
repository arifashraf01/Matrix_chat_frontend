function RoomItem({ roomName, roomInitial, preview, ts, unreadCount, active, onClick }) {
  const badgeLabel =
    unreadCount >= 9 ? "9+" : unreadCount > 0 ? `${unreadCount}` : "";
  const timeLabel = ts
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ts))
    : "";

  return (
    <button
      type="button"
      className={`room-item${active ? " room-item--active" : ""}`}
      onClick={onClick}
      aria-current={active ? "true" : "false"}
    >
      <span className="room-item__avatar" aria-hidden="true">
        {roomInitial}
      </span>
      <span className="room-item__toprow">
        <span className="room-item__name">{roomName}</span>
        {badgeLabel ? <span className="room-item__badge">{badgeLabel}</span> : null}
      </span>
      <span className="room-item__bottomrow">
        {preview ? <span className="room-item__preview">{preview}</span> : null}
        {timeLabel ? <span className="room-item__time">{timeLabel}</span> : null}
      </span>
    </button>
  );
}

export default RoomItem;
