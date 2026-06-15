import { 
  Building2, 
  Users, 
  Briefcase, 
  MessageSquare, 
  FileSpreadsheet, 
  LogOut, 
  Laptop, 
  UserSquare2,
  X
} from "lucide-react";
import { Employee } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: Employee;
  hasUnreadChat: boolean;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, currentUser, hasUnreadChat, isOpen, onClose, onLogout }: SidebarProps) {
  const isAdmin = currentUser.role === "sup_admin";

  const navigationItems = [
    {
      id: "dashboard",
      label: "Leta Technologies Overview",
      icon: Building2,
      hidden: !isAdmin, // Only sup_admin can see holding overview/branches
    },
    {
      id: "branches",
      label: "Branch Network",
      icon: Building2,
      hidden: !isAdmin, 
    },
    {
      id: "employees",
      label: "Employee Portal",
      icon: Users,
      hidden: !isAdmin,
    },
    {
      id: "jobs",
      label: "Service Tickets",
      icon: Briefcase,
      hidden: false, // visible to all, but list filter changes depending on role
    },
    {
      id: "live-chat",
      label: "Team Live Chat",
      icon: MessageSquare,
      hidden: false, // visible to all
    },
    {
      id: "paystubs",
      label: "Paystubs & GA Taxes",
      icon: FileSpreadsheet,
      hidden: false, // visible to employee (own paystubs) and admin (all paystubs)
    },
    {
      id: "profile",
      label: "My Profile Settings",
      icon: UserSquare2,
      hidden: false,
    },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay for mobile screen active drawers */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 md:hidden z-40 transition-opacity duration-300" 
        />
      )}

      <aside className={`fixed md:relative inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col justify-between h-full shadow-lg transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-indigo-600 rounded-sm text-white shadow-md shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-sans font-extrabold text-sm tracking-tight text-white m-0 truncate">
                Leta Technologies
              </h1>
              <p className="font-mono text-[9px] text-indigo-400 font-bold tracking-widest uppercase m-0 truncate">
                Full System LTFS
              </p>
            </div>
          </div>

          {/* Close Sidebar button shown only on cellular/mobile screens */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
            aria-label="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            if (item.hidden) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-sm font-sans text-xs font-semibold tracking-tight transition-all duration-150 outline-none cursor-pointer ${
                  isActive
                    ? "bg-slate-800 text-cyan-400 border-l-2 border-cyan-400"
                    : "text-slate-400 hover:bg-slate-800/65 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-white"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.id === "live-chat" && hasUnreadChat && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 border border-slate-900 animate-pulse block shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Employee Identity Card footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2.5 p-2 bg-slate-800/30 rounded border border-slate-800 mb-2.5">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-indigo-400/35"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-indigo-600/15 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/10">
                <UserSquare2 className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-sans text-xs font-bold text-slate-200 truncate leading-none m-0">
                {currentUser.fullName}
              </h4>
              <span className="inline-block mt-0.5 font-mono text-[8px] uppercase tracking-wide px-1 py-0.2 bg-slate-800 text-slate-400 rounded-xs border border-slate-700/60 font-semibold">
                {currentUser.role === "sup_admin" ? "SUP_ADMIN" : "TECHNICIAN"}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-rose-950/20 hover:text-rose-400 text-slate-400 text-xs font-bold rounded transition-colors border border-slate-700/50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit System</span>
          </button>
        </div>
      </aside>
    </>
  );
}
