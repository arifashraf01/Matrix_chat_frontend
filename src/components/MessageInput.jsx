import { useEffect, useRef, useState } from "react";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";

function MessageInput({
  value,
  onChange,
  onTypingStop,
  onSendMessage,
  onAttachImage,
  isImageUploading = false,
  uploadError = "",
  disabled,
}) {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const attachmentButtonRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!isEmojiOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        pickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target) ||
        attachmentButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsEmojiOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isEmojiOpen]);

  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    const currentValue = value || "";

    if (!input) {
      onChange(`${currentValue}${emoji}`);
      setIsEmojiOpen(false);
      return;
    }

    const start = input.selectionStart ?? currentValue.length;
    const end = input.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;

    onChange(nextValue);
    setIsEmojiOpen(false);

    window.requestAnimationFrame(() => {
      input.focus();
      const nextCursor = start + emoji.length;
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleEmojiClick = (emojiData) => {
    insertEmoji(emojiData.emoji);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsEmojiOpen(false);
    onSendMessage(value);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    await onAttachImage?.(file);
  };

  const handleBlur = () => {
    onTypingStop?.();
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="message-input__field"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={handleBlur}
        placeholder={disabled ? "Select a room first" : "Write a message"}
        disabled={disabled}
        autoComplete="off"
      />

      <input
        ref={fileInputRef}
        className="message-input__file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="message-input__actions">
        <button
          ref={attachmentButtonRef}
          className="message-input__attachment-button"
          type="button"
          onClick={triggerFilePicker}
          disabled={disabled || isImageUploading}
          aria-label="Attach image"
          title="Attach image"
        >
          {isImageUploading ? "Uploading..." : "📎"}
        </button>

        <button
          ref={emojiButtonRef}
          className="message-input__emoji-button"
          type="button"
          onClick={() => setIsEmojiOpen((current) => !current)}
          disabled={disabled}
          aria-label="Open emoji picker"
        >
          ☺
        </button>

        {isEmojiOpen ? (
          <div ref={pickerRef} className="message-input__emoji-picker" role="dialog" aria-label="Emoji picker">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              emojiStyle={EmojiStyle.NATIVE}
              searchDisabled
              skinTonesDisabled
              lazyLoadEmojis={false}
              width={320}
              height={420}
            />
          </div>
        ) : null}

        <button className="message-input__button" type="submit" disabled={disabled || !value.trim()} aria-label="Send message" title="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {uploadError ? (
        <p className="message-input__status message-input__status--error" role="status" aria-live="polite">
          {uploadError}
        </p>
      ) : isImageUploading ? (
        <p className="message-input__status" role="status" aria-live="polite">
          Uploading...
        </p>
      ) : null}
    </form>
  );
}

export default MessageInput;
