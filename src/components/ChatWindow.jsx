import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import AddPeopleModal from "./AddPeopleModal";
import ConfirmModal from "./ConfirmModal";
import { formatLastSeen } from "../services/matrixClient";
import { useState } from "react";

function ChatWindow({
  room,
  roomTitle,
  client,
  messages,
  currentUserId,
  presenceSummary,
  typingUsers,
  receiptMap,
  profileTarget,
  onOpenProfile,
  onOpenImagePreview,
  onInviteUser,
  onLeaveRoom,
  draft,
  onDraftChange,
  onTypingStop,
  onSendMessage,
  onAttachImage,
  isImageUploading,
  uploadError,
}) {
  const presenceLabel = presenceSummary
    ? presenceSummary.tone === "online"
      ? "Online"
      : presenceSummary.tone === "away"
        ? "Away"
        : presenceSummary.tone === "offline"
          ? formatLastSeen(presenceSummary.lastSeenTs)
          : "Unknown"
    : "";
  const typingText =
    typingUsers.length === 0
      ? ""
      : typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : typingUsers.length === 2
          ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
          : `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers[typingUsers.length - 1]} are typing...`;
  const typingAvatar = typingUsers[0]?.trim()?.charAt(0)?.toUpperCase() || "";
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  if (!room) {
    return (
      <section className="chat-window chat-window--empty">
        <div className="chat-window__empty">
          <p className="eyebrow">Chat window</p>
          <h2>{roomTitle}</h2>
          <p>Pick a room from the sidebar to load its timeline.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-window">
      <header className="chat-window__header">
        <div className="chat-window__header-main">
          <button
            type="button"
            className="chat-window__profile-trigger"
            onClick={onOpenProfile}
            disabled={!profileTarget}
          >
            <span className="chat-window__profile-avatar" aria-hidden="true">
              {profileTarget?.avatarUrl ? (
                <img
                  src={profileTarget.avatarUrl}
                  alt=""
                  className="chat-window__profile-avatar-image"
                />
              ) : (
                profileTarget?.avatarInitial || roomTitle.charAt(0).toUpperCase()
              )}
            </span>

            <div className="chat-window__profile-copy">
              <p className="eyebrow">Chat window</p>
              <h2>{profileTarget?.displayName || roomTitle}</h2>
            </div>
          </button>
          {presenceSummary ? (
            <div className={`chat-window__presence chat-window__presence--${presenceSummary.tone}`}>
              <span className="chat-window__presence-dot" aria-hidden="true" />
              <span className="chat-window__presence-text">{presenceLabel}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p className="chat-window__count" style={{ margin: 0 }}>{messages.length} messages</p>
          <div className="chat-window__actions">
            <button
              type="button"
              className="header-action header-action--outline"
              onClick={() => setAddPeopleOpen(true)}
            >
              + Add People
            </button>

            <button
              type="button"
              className="header-action header-action--danger"
              onClick={() => setLeaveOpen(true)}
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>

      <AddPeopleModal
        open={addPeopleOpen}
        onClose={() => setAddPeopleOpen(false)}
        onInvite={async (userId) => {
          if (typeof onInviteUser === "function") {
            await onInviteUser(room?.roomId, userId);
          } else {
            if (!client || !room) throw new Error("Not connected or no room selected");
            await client.invite(room.roomId, userId);
          }
        }}
      />

      <ConfirmModal
        open={leaveOpen}
        title="Leave Room?"
        message="Are you sure you want to leave this room?"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={async () => {
          try {
            if (typeof onLeaveRoom === "function") {
              await onLeaveRoom(room?.roomId);
            } else {
              if (client && room) await client.leave(room.roomId);
            }
          } finally {
            setLeaveOpen(false);
          }
        }}
        confirmLabel="Leave"
        cancelLabel="Cancel"
      />

      <MessageList
        messages={messages}
        room={room}
        currentUserId={currentUserId}
        receiptMap={receiptMap}
        client={client}
        onOpenImagePreview={onOpenImagePreview}
      />

      {typingText ? (
        <div className="chat-window__typing-row" aria-live="polite">
          <div className="chat-window__typing-avatar" aria-hidden="true">
            {typingAvatar}
          </div>
          <p className="chat-window__typing-text">{typingText}</p>
        </div>
      ) : null}

      <MessageInput
        value={draft}
        onChange={onDraftChange}
        onTypingStop={onTypingStop}
        onSendMessage={onSendMessage}
        onAttachImage={onAttachImage}
        isImageUploading={isImageUploading}
        uploadError={uploadError}
        disabled={!room}
      />
    </section>
  );
}

export default ChatWindow;
