import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadMatrixMediaBlob,
  getMessageDisplayUrl,
  getMessageHttpUrl,
  getOutgoingMessageReceiptStatus,
  getReceiptGlyphAscii,
} from "../services/matrixClient";

function MessageList({ messages, room, currentUserId, receiptMap = {}, client, onOpenImagePreview }) {
  const bottomRef = useRef(null);
  const objectUrlRef = useRef(new Map());
  const loadingRef = useRef(new Set());
  const failedRef = useRef(new Set());
  const [imageSrcMap, setImageSrcMap] = useState({});

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

  useEffect(() => {
    messages.forEach((message) => {
      if (message.kind !== "image") {
        return;
      }

      const imageUrl = getMessageHttpUrl(client, message);
      const displayUrl = getMessageDisplayUrl(client, message);
      console.log("Matrix image event:", {
        eventType: message.eventType,
        msgtype: message.msgtype,
        imageUrl,
        displayUrl,
        contentUrl: message.rawContent?.url ?? null,
        thumbnailUrl: message.rawContent?.thumbnail_url ?? null,
        fileUrl: message.rawContent?.file?.url ?? null,
        fileThumbnailUrl: message.rawContent?.file?.thumbnail_url ?? null,
      });
    });
  }, [messages, client]);

  useEffect(() => {
    let cancelled = false;

    const resolveImage = async (message) => {
      if (
        !client ||
        (!message.mediaUrl && !message.thumbnailUrl) ||
        loadingRef.current.has(message.id) ||
        objectUrlRef.current.has(message.id) ||
        failedRef.current.has(message.id)
      ) {
        return;
      }

      loadingRef.current.add(message.id);

      try {
        const sourceUrl = message.mediaUrl || message.thumbnailUrl;
        const imageUrl = getMessageHttpUrl(client, message);
        const displayUrl = getMessageDisplayUrl(client, message);

        console.log("Matrix image resolve:", {
          eventType: message.eventType,
          msgtype: message.msgtype,
          imageUrl,
          displayUrl,
          contentUrl: message.rawContent?.url ?? null,
          thumbnailUrl: message.rawContent?.thumbnail_url ?? null,
          fileUrl: message.rawContent?.file?.url ?? null,
          fileThumbnailUrl: message.rawContent?.file?.thumbnail_url ?? null,
        });

        if (!imageUrl && !displayUrl) {
          throw new Error("Unable to resolve image URL.");
        }

        setImageSrcMap((currentMap) => ({
          ...currentMap,
          [message.id]: displayUrl || imageUrl,
        }));

        const blob = await downloadMatrixMediaBlob(client, sourceUrl || imageUrl);
        if (!blob) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        objectUrlRef.current.set(message.id, objectUrl);
        setImageSrcMap((currentMap) => ({
          ...currentMap,
          [message.id]: objectUrl,
        }));
      } catch {
        failedRef.current.add(message.id);
        const fallbackUrl = getMessageHttpUrl(client, message);
        console.log("Matrix image fallback:", {
          eventType: message.eventType,
          msgtype: message.msgtype,
          imageUrl: fallbackUrl,
          displayUrl: getMessageDisplayUrl(client, message),
          sourceUrl: message.mediaUrl || message.thumbnailUrl,
          rawContent: message.rawContent,
        });
        if (fallbackUrl) {
          setImageSrcMap((currentMap) => ({
            ...currentMap,
            [message.id]: fallbackUrl,
          }));
          return;
        }
      } finally {
        loadingRef.current.delete(message.id);
      }
    };

    messages.forEach((message) => {
      if (message.kind === "image" && (message.mediaUrl || message.thumbnailUrl) && !imageSrcMap[message.id]) {
        void resolveImage(message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [messages, client, imageSrcMap]);

  useEffect(
    () => () => {
      for (const objectUrl of objectUrlRef.current.values()) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrlRef.current.clear();
    },
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
          const imageUrl =
            message.kind === "image"
              ? imageSrcMap[message.id] || getMessageDisplayUrl(client, message) || getMessageHttpUrl(client, message)
              : "";
          const hasRenderableImage = message.kind === "image" && Boolean(imageUrl);

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
              {hasRenderableImage ? (
                <button
                  type="button"
                  className="message-card__image-button"
                  onClick={() =>
                    onOpenImagePreview?.({
                      src: imageUrl,
                      alt: message.altText || "Image message",
                      title: message.body || message.altText || "Image",
                      senderName,
                    })
                  }
                >
                 <img
  className="message-card__image"
  src={imageUrl}
  alt={message.altText || "Image message"}
  loading="lazy"
  decoding="async"
  crossOrigin="anonymous"
  onLoad={() => {
    console.log("IMAGE LOADED");
  }}
  onError={(e) => {
    console.log("IMAGE ERROR");
    console.log(e.target.src);
  }}
/>
                </button>
              ) : (
                <p className="message-card__body">{message.kind === "image" ? "Image unavailable" : message.body}</p>
              )}
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
