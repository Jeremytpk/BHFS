import React from "react";
import { ShieldCheck, UserCheck, HelpCircle } from "lucide-react";
import { Employee } from "../types";

interface DeveloperConsoleProps {
  employees: Employee[];
  currentUser: Employee;
  onSetUser: (user: Employee) => void;
}

export default function DeveloperConsole({ employees, currentUser, onSetUser }: DeveloperConsoleProps) {
  const handleSwap = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = employees.find((x) => x.uid === e.target.value);
    if (selected) {
      onSetUser(selected);
    }
  };

  return (
    <div className="bg-slate-950 border-b border-slate-800 p-2 px-4 flex flex-col sm:flex-row items-center justify-between text-slate-100 shrink-0 gap-2.5">
      {/* Brand logo details block */}
      <div className="flex items-center gap-2.5">
        <div className="p-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xs">
          <ShieldCheck className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <span className="font-sans text-[11px] font-bold text-slate-300 block tracking-tight">
            BHFS Evaluation & Testing Control Deck
          </span>
          <span className="font-sans text-[10px] text-slate-500 block leading-tight">
            Toggle credentialed GA on-site contractors to inspect workspace layouts instantly.
          </span>
        </div>
      </div>

      {/* Selector dropdown */}
      <div className="flex items-center gap-2.5 shrink-0">
        <label className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 font-mono">
          <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Active Persona:</span>
        </label>
        <select
          value={currentUser.uid}
          onChange={handleSwap}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-sans px-2.5 py-1 rounded-sm outline-none focus:ring-1 focus:ring-cyan-400 w-56 cursor-pointer"
        >
          {employees.map((emp) => (
            <option key={emp.uid} value={emp.uid}>
              {emp.fullName} ({emp.role === "sup_admin" ? "Super Admin" : "Technician"})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
