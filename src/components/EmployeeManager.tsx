import React, { useState } from "react";
import { Plus, Users, Landmark, BadgeAlert, Key, ClipboardList, CheckCircle2, DollarSign, Edit3, Trash2, X, ShieldAlert } from "lucide-react";
import { Employee, Branch } from "../types";
import { createEmployee, updateEmployee, deleteEmployee } from "../lib/dataService";

interface EmployeeManagerProps {
  employees: Employee[];
  branches: Branch[];
  onRefresh: () => void;
}

export default function EmployeeManager({ employees, branches, onRefresh }: EmployeeManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form Fields (Registration)
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState<"sup_admin" | "employee">("employee");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState(45);
  const [password, setPassword] = useState("");

  // Editing State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState(45);
  const [editBranchId, setEditBranchId] = useState("");
  const [editRole, setEditRole] = useState<"sup_admin" | "employee">("employee");
  const [editStatus, setEditStatus] = useState<"active" | "pending">("pending");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !branchId || !phone || !password) {
      setErrorMsg("Please fill in all employee setup fields.");
      return;
    }

    if (employees.some((emp) => emp.email.toLowerCase() === email.trim().toLowerCase())) {
      setErrorMsg("An employee with this email already exists in Leta/Bora registry.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      // Establish transient temporary secondary Firebase App registration to create credentials
      // without interrupting the active admin login session.
      const { initializeApp, getApp, deleteApp } = await import("firebase/app");
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
      const tempConfig = await import("../../firebase-applet-config.json");

      let tempApp;
      try {
        tempApp = initializeApp(tempConfig.default || tempConfig, "tempAdminEmployeeCreatorApp");
      } catch (appErr) {
        tempApp = getApp("tempAdminEmployeeCreatorApp");
      }
      const tempAuth = getAuth(tempApp);

      const userCred = await createUserWithEmailAndPassword(
        tempAuth,
        email.trim().toLowerCase(),
        password.trim()
      );

      const firebaseUid = userCred.user.uid;

      // Clean up the temporary application instances
      await signOut(tempAuth);
      await deleteApp(tempApp);

      await createEmployee({
        uid: firebaseUid,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        branchId,
        role,
        phone: phone.trim(),
        hourlyRate: Number(hourlyRate),
        createdAt: new Date().toISOString(),
        rawPassword: password.trim(), // Storing raw password for immediate local auth switch accessibility in preview
        status: "pending", // New account is pending until activation
      });

      // Brief elegant synching delay to display the processing state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccessMsg(`Registered ${fullName} successfully! Account is PENDING approval. Credentials password: "${password}"`);
      setErrorMsg("");
      setEmail("");
      setFullName("");
      setBranchId("");
      setRole("employee");
      setPhone("");
      setHourlyRate(45);
      setPassword("");
      setShowAddForm(false);
      onRefresh();

      // Keep success message a bit longer so admin can note down the credential
      setTimeout(() => setSuccessMsg(""), 12000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to catalog new staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFullName(emp.fullName || "");
    setEditPhone(emp.phone || "");
    setEditHourlyRate(emp.hourlyRate || 45);
    setEditBranchId(emp.branchId || "");
    setEditRole(emp.role || "employee");
    setEditStatus(emp.status || "active");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      await updateEmployee(editingEmployee.uid, {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        hourlyRate: Number(editHourlyRate),
        branchId: editBranchId,
        role: editRole,
        status: editStatus,
      });

      setSuccessMsg(`Successfully updated staff configuration data for ${editFullName}!`);
      setEditingEmployee(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      alert("Error updating personnel record: " + err.message);
    }
  };

  const handleDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      const emp = employeeToDelete;
      await deleteEmployee(emp.uid);
      setSuccessMsg(`Successfully deleted personnel record for ${emp.fullName} from core systems.`);
      setEmployeeToDelete(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      alert("Could not remove employee records: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-sans font-extrabold text-base tracking-tight text-slate-800 m-0">
            Personnel Directory & Credentials
          </h2>
          <p className="font-sans text-[11px] text-slate-400 m-0 mt-0.5">
            Register, edit, or activate/pend field technician accounts and hourly service rates for Leta Technologies.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingEmployee(null);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New Staff</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-sm font-sans space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <span className="font-semibold">System Notification Callback:</span>
          </div>
          <p className="font-mono text-xs text-teal-800 break-all leading-relaxed m-0">
            {successMsg}
          </p>
        </div>
      )}

      {/* Edit Form Modal/Panel */}
      {editingEmployee && (
        <form
          onSubmit={handleUpdate}
          className="p-6 bg-slate-50 rounded-xl border-2 border-indigo-400 shadow-xl space-y-4 max-w-3xl animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="font-sans font-bold text-base text-slate-900 m-0 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Edit Staff Profile: {editingEmployee.fullName}
              </h3>
              <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                Note: Email ({editingEmployee.email}) and secure Authentication password parameters are immutable for security.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Connected Branch Hub
              </label>
              <select
                value={editBranchId}
                onChange={(e) => setEditBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850"
                required
              >
                <option value="">-- Choose Branch --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city}, {b.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Hourly Rate ($/hr)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1000"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850"
                  required
                />
              </div>

              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  System Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850"
                >
                  <option value="employee">Technician</option>
                  <option value="sup_admin">Sup Admin</option>
                </select>
              </div>

              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Status State
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold ${
                    editStatus === "active" ? "text-emerald-700 border-emerald-350 bg-emerald-50/20" : "text-amber-700 border-amber-350 bg-amber-50/20"
                  }`}
                >
                  <option value="active">🟢 Active</option>
                  <option value="pending">🟡 Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="px-4 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-250 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* Register Employee Form */}
      {showAddForm && (
        isSubmitting ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col items-center justify-center space-y-4 max-w-3xl min-h-[300px] animate-fadeIn">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Stationary Connected Screens Icon */}
              <Users className="w-8 h-8 text-indigo-500 relative z-10 animate-pulse" />
              {/* Rotating circle over the icon */}
              <div className="absolute inset-0 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center font-sans">
              <h4 className="font-bold text-sm text-slate-800 m-0">Generating Employee Portfolio...</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Pushing corporate records & configuring network permissions...</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-xl space-y-4 max-w-3xl animate-fadeIn"
          >
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="font-sans font-bold text-base text-slate-900 m-0">
                Create Employee Profile & Credentials
              </h3>
              <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                New accounts start in a **Pending** status. A Super Administrator must active the account prior to tech terminal login.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anthony Davis"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Email Address (Used to Login)
                </label>
                <input
                  type="type"
                  placeholder="e.g. anthony.tech@letatech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Corporate System Passcode
                </label>
                <input
                  type="text"
                  placeholder="e.g. secureLeta44"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +1 (404) 555-0329"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Branch Assignment
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  required
                >
                  <option value="">-- Choose Division --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city}, {b.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Assigned Privilege Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  >
                    <option value="employee">Technician / Employee</option>
                    <option value="sup_admin">Super Administrator (sup_admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Hourly Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="1000"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                    required
                  />
                </div>
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
                Generate Credentials
              </button>
            </div>
          </form>
        )
      )}

      {/* Directory Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h4 className="font-sans font-bold text-xs text-slate-700 m-0 uppercase tracking-wider">
            Active Registry Employees ({employees.length})
          </h4>
          <span className="font-sans text-[10px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/55">
            Real-Time Auth
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                <th className="px-4 py-2">Name & Email</th>
                <th className="px-4 py-2">Assigned Branch</th>
                <th className="px-4 py-2">Hourly Cost</th>
                <th className="px-4 py-2">Privilege</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 font-mono text-center w-28">System Passcode</th>
                <th className="px-4 py-2 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {employees.map((emp) => {
                const isSuper = emp.role === "sup_admin";
                const matchingBranchName = branches.find((b) => b.id === emp.branchId)?.name || emp.branchId;
                const activeVal = emp.status || "active";

                return (
                  <tr key={emp.uid} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {emp.photoURL ? (
                          <img
                            src={emp.photoURL}
                            alt={emp.fullName}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover border border-indigo-100"
                          />
                        ) : (
                          <div className={`w-7 h-7 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-[10px]`}>
                            {emp.fullName.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                        <div>
                          <p className="font-sans font-bold text-slate-800 m-0 leading-tight">
                            {emp.fullName}
                          </p>
                          <p className="font-mono text-[9px] text-slate-400 m-0 mt-0.5">
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <span className="font-sans text-slate-600 font-semibold truncate max-w-[150px] inline-block">
                        {matchingBranchName}
                      </span>
                    </td>

                    <td className="px-4 py-2 font-mono font-bold text-slate-950">
                      ${Number(emp.hourlyRate).toFixed(2)}/hr
                    </td>

                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-sm font-mono text-[9px] uppercase font-bold text-center border ${
                        isSuper 
                          ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                          : "bg-teal-50 border-teal-100 text-teal-700"
                      }`}>
                        {emp.role}
                      </span>
                    </td>

                    <td className="px-4 py-2">
                      {activeVal === "active" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/80">
                          🟢 Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/80">
                          🟡 Pending
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-600 mx-auto select-all">
                        <Key className="w-3 h-3 text-slate-400" />
                        <span className="font-bold">{emp.rawPassword || "google-auth"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(emp)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit Personal Information"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Permanently Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern React-state-based Employee Delete Confirmation Modal */}
      {employeeToDelete && (
        <div id="employee-delete-modal" className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 rounded-full text-rose-600 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                  Critical Security Confirmation
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Are you sure you want to permanently delete the profile container and system credentials of <span className="font-bold text-slate-800">{employeeToDelete.fullName}</span>?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] font-mono text-slate-600 space-y-1">
              <div><span className="text-slate-400">EMAIL:</span> {employeeToDelete.email}</div>
              <div><span className="text-slate-400">UID:</span> {employeeToDelete.uid}</div>
              <div><span className="text-slate-400">HOURLY RATE:</span> ${employeeToDelete.hourlyRate}/hr</div>
            </div>

            <p className="text-[11px] text-amber-600 bg-amber-50/50 border border-amber-100 rounded p-2.5 leading-normal font-sans">
              ⚠️ Warning: This action will purge all authentication references and security roles for this account instantly.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEmployeeToDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-sans text-xs font-bold rounded-lg transition-colors border border-transparent cursor-pointer"
                id="cancel-employee-delete"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEmployee}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold rounded-lg transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1.5"
                id="confirm-employee-delete"
              >
                <Trash2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
