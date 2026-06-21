import { useEffect, useMemo, useRef } from "react";
import { getOutgoingMessageReceiptStatus, getReceiptGlyphAscii } from "../services/matrixClient";

function MessageList({ messages, room, currentUserId, receiptMap = {} }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, room?.roomId]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  return (
    <div className="message-list" aria-live="polite" aria-label="Room messages">
      {messages.length === 0 ? (
        <div className="message-list__empty">
          <h3>No messages yet</h3>
          <p>Send the first message to start the conversation.</p>
        </div>
      ) : (
        messages.map((message) => {
          const member = room?.getMember?.(message.sender);
          const senderName = message.sender === currentUserId ? "You" : member?.name || message.sender;
          const isOwnMessage = message.sender === currentUserId;
          const isPending =
            message.status === "sending" || message.status === "queued" || message.status === "encrypting";
          const receiptStatus = isOwnMessage
            ? isPending
              ? "sent"
              : receiptMap[message.eventId] ??
                (message.eventId ? getOutgoingMessageReceiptStatus(room, message, currentUserId) : "sent")
            : null;
          const receiptGlyph = receiptStatus ? getReceiptGlyphAscii(receiptStatus) : "";

          return (
            <article
              key={message.id}
              className={`message-card${isOwnMessage ? " message-card--own" : ""}`}
            >
              <div className="message-card__meta">
                <span className="message-card__sender">{senderName}</span>
                <span className="message-card__time">
                  {timeFormatter.format(new Date(message.ts))}
                </span>
              </div>
              <p className="message-card__body">{message.body}</p>
              {isOwnMessage && receiptGlyph ? (
                <div className="message-card__footer">
                  <span
                    className={`message-card__receipt message-card__receipt--${receiptStatus}`}
                    title={receiptStatus}
                    aria-label={receiptStatus}
                  >
                    {receiptGlyph}
                  </span>
                </div>
              ) : null}
            </article>
          );
        })
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
