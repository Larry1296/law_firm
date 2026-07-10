// src/modules/core/communication/ChatComposer.jsx

import { useState } from "react";

const ChatComposer = ({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [text, setText] = useState("");

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    await onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-white">
      <textarea
        className="flex-1 resize-none rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
};

export default ChatComposer;
