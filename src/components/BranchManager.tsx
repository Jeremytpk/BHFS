import React, { useState } from "react";
import { Plus, Building2, MapPin, Landmark, ArrowRight, ShieldCheck, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { Branch } from "../types";
import { createBranch, deleteBranch } from "../lib/dataService";

interface BranchManagerProps {
  branches: Branch[];
  onRefresh: () => void;
}

export default function BranchManager({ branches, onRefresh }: BranchManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // Form Fields
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("GA");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !name || !address || !city || !state) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    const cleanedId = branchId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanedId) {
      setErrorMsg("Invalid Branch ID character set.");
      return;
    }

    // Check if ID already exists
    if (branches.some((b) => b.id === cleanedId)) {
      setErrorMsg("A branch with this ID already exists.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      await createBranch({
        id: cleanedId,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.toUpperCase(),
      });

      // Brief elegant synching delay to display the processing state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccessMsg("New branch corporate subsidiary registered successfully!");
      setErrorMsg("");
      setBranchId("");
      setName("");
      setAddress("");
      setCity("");
      setState("GA");
      setShowAddForm(false);
      onRefresh();

      // Clear success notification
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not register branch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-sans font-extrabold text-base tracking-tight text-slate-800 m-0">
            Regional Branch Network
          </h2>
          <p className="font-sans text-[11px] text-slate-400 m-0 mt-0.5">
            Identify, allocate, and monitor regional service units and subsidiaries under Bora Holding.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Regional Branch</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-sans animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Branch Form overlay collapsible */}
      {showAddForm && (
        isSubmitting ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col items-center justify-center space-y-4 max-w-2xl min-h-[300px] animate-fadeIn">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Stationary Connected Screens Icon */}
              <Building2 className="w-8 h-8 text-indigo-500 relative z-10 animate-pulse" />
              {/* Rotating circle over the icon */}
              <div className="absolute inset-0 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center font-sans block">
              <h4 className="font-bold text-sm text-slate-800 m-0">Cataloging Subsidiary division...</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Registering state structures & committing branch profile metadata document...</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-xl space-y-4 max-w-2xl animate-fadeIn"
          >
            <h3 className="font-sans font-bold text-lg text-slate-900 border-b border-slate-100 pb-2">
              Register Subsidiary Division
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Branch Access Identifier (No spaces)
                </label>
                <input
                  type="text"
                  placeholder="e.g. leta-tech-north-ga"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Subsidiary Legal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leta Technologies LLC (North)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Physical Office Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 555 Piedmont Ave NE"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  City Office
                </label>
                <input
                  type="text"
                  placeholder="e.g. Atlanta"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  US State Headquarters
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="GA">Georgia (GA)</option>
                  <option value="AL">Alabama (AL)</option>
                  <option value="FL">Florida (FL)</option>
                  <option value="NC">North Carolina (NC)</option>
                  <option value="SC">South Carolina (SC)</option>
                  <option value="TN">Tennessee (TN)</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-sans text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                ⚠️ {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-500 text-sm font-semibold hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-md transition-all cursor-pointer"
              >
                Save Regional Branch
              </button>
            </div>
          </form>
        )
      )}

      {/* Branches List Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => {
          const isLeta = branch.id.includes("leta");
          return (
            <div
              key={branch.id}
              className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 hover:shadow-sm hover:border-slate-300 transition-all duration-150 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-sm ${isLeta ? "bg-cyan-50 text-cyan-700" : "bg-indigo-50 text-indigo-700"} group-hover:scale-105 transition-transform duration-150`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold">
                      {branch.id}
                    </span>
                    <button
                      onClick={() => setBranchToDelete(branch)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Permanently Delete Branch"
                      id={`delete-btn-${branch.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-sans font-bold text-sm text-slate-800 mt-3.5 m-0 group-hover:text-indigo-600 transition-colors">
                  {branch.name}
                </h4>

                <div className="flex items-start gap-1.5 mt-2 text-slate-500 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="leading-tight">
                    <p className="m-0 font-sans font-medium text-[11px] text-slate-600">{branch.address}</p>
                    <p className="m-0 font-sans text-[10px] text-slate-450 mt-0.5">
                      {branch.city}, {branch.state}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Authorized Hub</span>
                </div>
                <span>Corporate GA subsidiary</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern React-state-based Branch Delete Confirmation Modal */}
      {branchToDelete && (
        <div id="branch-delete-modal" className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 rounded-full text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                  Critical Deletion Warning
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Are you sure you want to permanently delete the regional hub <span className="font-bold text-slate-800">{branchToDelete.name}</span>?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] font-mono text-slate-600 space-y-1">
              <div><span className="text-slate-400">ID:</span> {branchToDelete.id}</div>
              <div><span className="text-slate-400">PHYSICAL ADDRESS:</span> {branchToDelete.address}</div>
              <div><span className="text-slate-400">LOCATION:</span> {branchToDelete.city}, {branchToDelete.state}</div>
            </div>

            <p className="text-[11px] text-amber-600 bg-amber-50/50 border border-amber-100 rounded p-2.5 leading-normal font-sans">
              ⚠️ Warning: Staff elements and job tickets assigned to this branch identifier will lose their associated regional assignment metadata.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBranchToDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-sans text-xs font-bold rounded-lg transition-colors border border-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteBranch(branchToDelete.id);
                    setSuccessMsg(`Successfully retired branch subsidiary '${branchToDelete.name}' from network listings.`);
                    setBranchToDelete(null);
                    onRefresh();
                    setTimeout(() => setSuccessMsg(""), 6000);
                  } catch (err: any) {
                    setErrorMsg("Error removing regional bureau: " + err.message);
                    setBranchToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold rounded-lg transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
