// src/modules/core/communication/ChatInput.jsx

import { useState } from "react";

const ChatInput = ({
  onSend,
  disabled = false,
  placeholder = "Write a message...",
}) => {
  const [message, setMessage] = useState("");

  const send = async () => {
    const text = message.trim();
    if (!text || disabled) return;

    await onSend(text);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    // Enter sends message
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t bg-white">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={send}
        disabled={disabled || !message.trim()}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;
