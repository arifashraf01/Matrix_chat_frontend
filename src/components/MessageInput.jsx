function MessageInput({ value, onChange, onTypingStop, onSendMessage, disabled }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSendMessage(value);
  };

  const handleBlur = () => {
    onTypingStop?.();
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        className="message-input__field"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={handleBlur}
        placeholder={disabled ? "Select a room first" : "Write a message"}
        disabled={disabled}
        autoComplete="off"
      />

      <button className="message-input__button" type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}

export default MessageInput;
