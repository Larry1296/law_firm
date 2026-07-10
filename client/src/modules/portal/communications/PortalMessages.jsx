import { useState } from "react";
import { MessageSquare, Send, Search } from "lucide-react";

const dummyChats = [
  {
    id: 1,
    name: "SheriaDesk Support",
    lastMessage: "Your consultation has been confirmed.",
    time: "10:30 AM",
    unread: true,
  },
  {
    id: 2,
    name: "Legal Assistant",
    lastMessage: "Please upload your ID document.",
    time: "Yesterday",
    unread: false,
  },
];

const dummyMessages = [
  { id: 1, sender: "support", text: "Hello! How can we help you today?" },
  { id: 2, sender: "me", text: "I need help with my consultation booking." },
  { id: 3, sender: "support", text: "Sure, we are checking it for you." },
];

export default function PortalMessages() {
  const [selectedChat, setSelectedChat] = useState(dummyChats[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[80vh] animate-fadeIn">
      {/* CHAT LIST */}
      <div className="bg-surface-dark rounded-2xl border border-border-dark p-4 flex flex-col">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={18} /> Messages
        </h2>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute top-3 left-3 text-text-muted-dark"
          />
          <input
            placeholder="Search chats..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-background-dark border border-border-dark text-sm"
          />
        </div>

        <div className="space-y-2 overflow-y-auto">
          {dummyChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-3 rounded-xl cursor-pointer transition ${
                selectedChat.id === chat.id
                  ? "bg-brand-primary text-white"
                  : "hover:bg-border-dark"
              }`}
            >
              <div className="flex justify-between">
                <p className="font-medium text-sm">{chat.name}</p>
                {chat.unread && (
                  <span className="w-2 h-2 bg-error rounded-full"></span>
                )}
              </div>
              <p className="text-xs opacity-80">{chat.lastMessage}</p>
              <p className="text-[10px] mt-1 opacity-60">{chat.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className="lg:col-span-2 bg-surface-dark rounded-2xl border border-border-dark flex flex-col">
        {/* HEADER */}
        <div className="p-4 border-b border-border-dark">
          <h3 className="font-semibold">{selectedChat.name}</h3>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {dummyMessages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[70%] p-3 rounded-xl text-sm ${
                msg.sender === "me"
                  ? "ml-auto bg-brand-primary text-white"
                  : "bg-background-dark text-text-primary-dark"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-border-dark flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl bg-background-dark border border-border-dark text-sm"
          />
          <button className="bg-brand-primary text-white p-3 rounded-xl">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
