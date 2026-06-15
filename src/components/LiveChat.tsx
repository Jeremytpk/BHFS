import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, AlertCircle, Search, User, ArrowLeft, Clock } from "lucide-react";
import { ChatMessage, Employee } from "../types";
import { sendLiveChatMessage, subscribeLiveChat } from "../lib/dataService";

interface LiveChatProps {
  currentUser: Employee;
  employees: Employee[];
}

export default function LiveChat({ currentUser, employees }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser.role === "sup_admin";
  const techs = employees.filter((e) => e.role === "employee");

  // Local storage keys for tracking last viewed time to calculate unread indicators
  const getThreadStorageKey = (techId: string) => `lastViewedChat_${currentUser.uid}_${techId}`;

  // Monitor real-time chat updates
  useEffect(() => {
    const unsub = subscribeLiveChat((msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, []);

  // Update read timestamp for the currently active thread
  useEffect(() => {
    if (isAdmin && selectedTechId) {
      localStorage.setItem(getThreadStorageKey(selectedTechId), new Date().toISOString());
    } else if (!isAdmin) {
      localStorage.setItem(`lastViewedChatAt_${currentUser.uid}`, new Date().toISOString());
    }
  }, [selectedTechId, messages, isAdmin, currentUser.uid]);

  // Soft auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedTechId]);

  // Helper to resolve thread owner of a message
  const getAssociatedEmployeeId = (msg: ChatMessage): string | null => {
    if (msg.senderRole === "employee") {
      return msg.senderId;
    }
    return msg.recipientId || null;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    // Determine recipient thread
    const recipientId = isAdmin ? selectedTechId : currentUser.uid;
    if (isAdmin && !recipientId) return;

    try {
      await sendLiveChatMessage({
        id: `chat-${Date.now()}`,
        senderId: currentUser.uid,
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        text: text.trim(),
        recipientId: recipientId || undefined,
      });
      setText("");
    } catch (err) {
      console.error("Could not send chat packet: ", err);
    }
  };

  // Filter technicians based on search query
  const filteredTechs = techs.filter((t) =>
    t.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages for the active conversation
  const displayedMessages = messages.filter((msg) => {
    const assocId = getAssociatedEmployeeId(msg);
    if (!isAdmin) {
      // Tech sees their own messages, replies directed to them, and general legacy broadcasts
      return assocId === currentUser.uid || !assocId || msg.senderId === currentUser.uid;
    } else {
      // Admin sees messages in the selected active tech conversation thread
      return assocId === selectedTechId || (!assocId && selectedTechId);
    }
  });

  // Calculate info for technician list items
  const getTechChatStats = (techId: string) => {
    const techMsgs = messages.filter((m) => getAssociatedEmployeeId(m) === techId);
    const lastMsg = techMsgs[techMsgs.length - 1];
    
    // Find unread count from this tech
    const lastViewedStr = localStorage.getItem(getThreadStorageKey(techId));
    let unreadCount = 0;
    if (selectedTechId !== techId) {
      const fromTechMsgs = techMsgs.filter((m) => m.senderId === techId);
      if (!lastViewedStr) {
        unreadCount = fromTechMsgs.length;
      } else {
        const lastTime = new Date(lastViewedStr).getTime();
        unreadCount = fromTechMsgs.filter((m) => new Date(m.createdAt).getTime() > lastTime).length;
      }
    }

    return { lastMsg, unreadCount };
  };

  const activeSelectedTech = techs.find((t) => t.uid === selectedTechId);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-[calc(100vh-140px)] flex overflow-hidden">
      {/* 1. Admin Grouping Sidebar: List of Technicians */}
      {isAdmin && (
        <div
          className={`${
            selectedTechId ? "hidden md:flex" : "flex"
          } w-full md:w-80 border-r border-slate-200 bg-slate-50 flex-col shrink-0`}
        >
          {/* Sidebar Search Area */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span className="font-sans font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Support Active Threads
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search technician..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Subscribed active tech threads */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredTechs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-sans">
                No technicians found
              </div>
            ) : (
              filteredTechs.map((tech) => {
                const isSelected = selectedTechId === tech.uid;
                const { lastMsg, unreadCount } = getTechChatStats(tech.uid);

                return (
                  <button
                    key={tech.uid}
                    onClick={() => setSelectedTechId(tech.uid)}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white hover:bg-slate-100/80 text-slate-700 border border-slate-150"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 leading-none">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          tech.isOnBreak ? "bg-amber-400" : tech.isOnline ? "bg-green-500" : "bg-slate-350"
                        }`} />
                        <span className="font-sans font-bold text-xs truncate">
                          {tech.fullName}
                        </span>
                      </div>
                      
                      {/* Last message preview */}
                      <p className={`font-sans text-[10px] mt-1.5 truncate leading-tight ${
                        isSelected ? "text-indigo-100" : "text-slate-400"
                      }`}>
                        {lastMsg ? lastMsg.text : "No messages yet"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {lastMsg && (
                        <span className={`text-[8px] font-mono ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. Conversation Chat Area */}
      <div
        className={`${
          isAdmin && !selectedTechId ? "hidden md:flex" : "flex"
        } flex-1 flex-col h-full overflow-hidden`}
      >
        {/* Header Block */}
        <div className="px-6 py-4 border-b border-slate-150 bg-slate-55 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {isAdmin && selectedTechId && (
              <button
                onClick={() => setSelectedTechId(null)}
                className="md:hidden p-1.5 text-slate-600 hover:text-indigo-600 mr-1 cursor-pointer bg-slate-100 rounded"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="p-2 bg-indigo-55 border border-indigo-200 rounded-lg text-indigo-600 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-slate-900 m-0">
                {!isAdmin
                  ? "HQ Coordination Feed"
                  : activeSelectedTech
                  ? `Chat with ${activeSelectedTech.fullName}`
                  : "Dispatch Command Portal"}
              </h4>
              <p className="font-sans text-xs text-slate-400 mt-0.5 max-w-md truncate">
                {!isAdmin
                  ? "Real-time coordinator channel with headquarters administration."
                  : activeSelectedTech
                  ? `Direct terminal chat for branch coordination & onsite logs.`
                  : "Select a technician on the left to begin secure communications."}
              </p>
            </div>
          </div>

          {/* Quick status bar */}
          {((!isAdmin) || activeSelectedTech) && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider font-mono shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE</span>
            </div>
          )}
        </div>

        {/* Messages feed */}
        {isAdmin && !selectedTechId ? (
          <div className="flex-1 flex flex-col justify-center items-center p-12 bg-slate-50 text-center">
            <div className="p-4 bg-indigo-50/50 rounded-full text-indigo-600 mb-3 animate-pulse">
              <User className="w-10 h-10" />
            </div>
            <h4 className="font-sans font-bold text-slate-800">No Technician Selected</h4>
            <p className="font-sans text-xs text-slate-400 mt-1 max-w-sm">
              Please click an active field technician on the left panel to review current shift coordinates or reply to client alerts.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
            {displayedMessages.length === 0 ? (
              <div className="p-12 text-center h-full flex flex-col justify-center items-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-sans text-slate-500 font-medium text-xs m-0">
                  No instant channel records found.
                </p>
                <p className="font-sans text-[11px] text-slate-400 mt-1">
                  Type an instant notification message below to begin direct dispatch support.
                </p>
              </div>
            ) : (
              displayedMessages.map((msg) => {
                const isSelf = msg.senderId === currentUser.uid;
                const isMsgAdmin = msg.senderRole === "sup_admin";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1 max-w-[80%] ${
                      isSelf ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    {/* Meta header */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans text-[10px] font-bold text-slate-500">
                        {msg.senderName}
                      </span>
                      <span
                        className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.2 rounded font-semibold ${
                          isMsgAdmin
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        {isMsgAdmin ? "Admin" : "Tech"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`p-3.5 rounded-2xl font-sans text-xs inline-block leading-relaxed shadow-xs ${
                        isSelf
                          ? "bg-slate-900 text-white rounded-tr-none"
                          : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                      }`}
                    >
                      <p className="m-0 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Message Sender input footer */}
        {((!isAdmin) || selectedTechId) && (
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-slate-150 bg-slate-50 flex items-center gap-3 shrink-0"
          >
            <input
              type="text"
              placeholder="Type dispatch coordinate update or instant notification..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Send Chat</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
