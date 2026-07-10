// src/components/chat/ChatMessage.jsx
import React from "react";

const ChatMessage = ({ message }) => {
  const isUser = message.sender === "user";

  return (
    <div className={`flex mb-2 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-3 py-2 rounded-xl max-w-[70%] text-sm shadow
        ${isUser ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
      >
        <p>{message.text}</p>

        <div className="text-[10px] opacity-60 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
