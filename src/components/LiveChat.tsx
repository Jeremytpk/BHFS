import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, AlertCircle, Sparkles } from "lucide-react";
import { ChatMessage, Employee } from "../types";
import { sendLiveChatMessage, subscribeLiveChat } from "../lib/dataService";

interface LiveChatProps {
  currentUser: Employee;
}

export default function LiveChat({ currentUser }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Monitor real-time chat updates
  useEffect(() => {
    const unsub = subscribeLiveChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, []);

  // Soft auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      await sendLiveChatMessage({
        id: `chat-${Date.now()}`,
        senderId: currentUser.uid,
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        text: text.trim(),
      });
      setText("");
    } catch (err) {
      console.error("Could not send chat packet: ", err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-[calc(100vh-140px)] flex flex-col justify-between overflow-hidden">
      {/* Upper chat banner */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-slate-900 m-0">Team Coordination Live Channel</h4>
            <p className="font-sans text-xs text-slate-400 mt-0.5">
              Live coordinator channel between Leta Technologies LLC administrators and onsite technicians.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PORTAL ACTIVE</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="p-12 text-center h-full flex flex-col justify-center items-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-sans text-slate-500 font-medium m-0">No live messages found in the coordinate database.</p>
            <p className="font-sans text-xs text-slate-400 mt-1">Begin typing below to notify other technicians on shift.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSelf = message.senderId === currentUser.uid;
            const isAdmin = message.senderRole === "sup_admin";

            return (
              <div
                key={message.id}
                className={`flex flex-col space-y-1 max-w-[80%] ${isSelf ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                {/* Meta header */}
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-[10px] font-bold text-slate-500">
                    {message.senderName} 
                  </span>
                  <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.2 rounded font-semibold ${
                    isAdmin ? "bg-indigo-50 text-indigo-700" : "bg-cyan-50 text-cyan-700"
                  }`}>
                    {message.senderRole === "sup_admin" ? "Admin" : "Leta Tech"}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message bubble */}
                <div className={`p-3.5 rounded-2xl font-sans text-sm inline-block leading-relaxed shadow-sm ${
                  isSelf
                    ? "bg-slate-900 text-white rounded-tr-none"
                    : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                }`}>
                  <p className="m-0 whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Sender input footer */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
        <input
          type="text"
          placeholder="Type instant internal broadcast code message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Send Notification</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
