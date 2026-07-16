// src/modules/core/communication/ChatWindow.jsx

import { useState, useContext } from "react";
import { Send, Paperclip } from "lucide-react";
import ThemeContext from "@/core/store/ThemeContext";

export default function ChatWindow({ title = "Chat", messages = [] }) {
  const { theme } = useContext(ThemeContext);
  const [message, setMessage] = useState("");

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessage("");
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendMessage();
  };

  const card =
    theme === "dark"
      ? "bg-[color:var(--surface-dark)] border border-[color:var(--border-dark)] text-white"
      : "bg-[color:var(--surface-light)] border border-[color:var(--border-light)] text-black";

  return (
    <div className={`rounded-2xl shadow-soft flex flex-col h-[500px] ${card}`}>
      {/* HEADER */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-lg">{title}</h2>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-sm font-semibold">{m.user}</span>
            <div className="bg-[color:var(--brand-primary)] text-white px-4 py-2 rounded-xl w-fit max-w-[70%]">
              {m.text}
            </div>
            <span className="text-xs text-gray-400">{m.time}</span>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="p-4 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700">
        <button className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200">
          <Paperclip size={18} />
        </button>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message..."
          className="flex-1 px-4 py-3 rounded-xl border outline-none"
        />

        <button
          type="button"
          onClick={sendMessage}
          disabled={!message.trim()}
          className="px-4 py-3 rounded-xl bg-[color:var(--brand-primary)] text-white flex items-center gap-2 disabled:opacity-50"
        >
          <Send size={16} />
          Send
        </button>
      </div>
    </div>
  );
}
