import React, { useState, useEffect } from "react";
import { 
  Plus, 
  MapPin, 
  Clock, 
  DollarSign, 
  User, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  X,
  FileText,
  Trash2
} from "lucide-react";
import { Job, Employee, Branch, TicketComment, calculateDeductions } from "../types";
import { createJob, updateJobStatus, addJobComment, subscribeJobComments, deleteJob } from "../lib/dataService";

interface JobManagerProps {
  jobs: Job[];
  employees: Employee[];
  branches: Branch[];
  currentUser: Employee;
  onRefresh: () => void;
}

export default function JobManager({ jobs, employees, branches, currentUser, onRefresh }: JobManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Create Job Fields
  const [selectedBranch, setSelectedBranch] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTechId, setAssignedTechId] = useState("unassigned");
  const [payType, setPayType] = useState<"hourly" | "flat">("hourly");
  const [payRate, setPayRate] = useState(45);

  // Active Selected Job Modal / Detail Thread
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [activeComments, setActiveComments] = useState<TicketComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  // Technicians updating tasks fields
  const [techHoursVal, setTechHoursVal] = useState<number>(1);
  const [updatingStatusFlag, setUpdatingStatusFlag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Filter State
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isAdmin = currentUser.role === "sup_admin";

  // Filtered Jobs based on roles
  const viewableJobs = jobs.filter((job) => {
    // Admin sees all, technician only sees their assigned jobs
    const roleMatches = isAdmin ? true : job.assignedTechId === currentUser.uid;
    // Apply status filter
    const statusMatches = filterStatus === "all" ? true : job.status === filterStatus;
    return roleMatches && statusMatches;
  });

  // Track live comment thread updates when a job is selected
  useEffect(() => {
    if (!selectedJob) {
      setActiveComments([]);
      return;
    }
    const unsub = subscribeJobComments(selectedJob.id, (comments) => {
      setActiveComments(comments);
    });
    return () => unsub();
  }, [selectedJob]);

  // Keep selected job reference updated with fresh data from the main list
  useEffect(() => {
    if (selectedJob) {
      const fresh = jobs.find(j => j.id === selectedJob.id);
      if (fresh) setSelectedJob(fresh);
    }
  }, [jobs]);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !clientName || !clientAddress || !description) {
      setErrorMsg("Please provide all required client visit fields.");
      return;
    }

    const newJobId = `job-${Date.now().toString().slice(-6)}`;
    const matchingTech = employees.find((emp) => emp.uid === assignedTechId);
    const assignedTechName = matchingTech ? matchingTech.fullName : "Unassigned";

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      await createJob({
        id: newJobId,
        branchId: selectedBranch,
        clientName: clientName.trim(),
        clientAddress: clientAddress.trim(),
        description: description.trim(),
        assignedTechId,
        assignedTechName,
        status: "pending",
        payType,
        payRate: Number(payRate),
        loggedHours: 0,
      });

      // Brief elegant synching delay to display the processing state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccessMsg(`Service job ticket ${newJobId} compiled and dispatched!`);
      setErrorMsg("");
      setClientName("");
      setClientAddress("");
      setDescription("");
      setAssignedTechId("unassigned");
      setPayType("hourly");
      setPayRate(45);
      setShowAddForm(false);
      onRefresh();

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not dispatch new ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (targetStatus: Job["status"]) => {
    if (!selectedJob) return;
    setUpdatingStatusFlag(true);

    try {
      const hours = targetStatus === "completed" && selectedJob.payType === "hourly" ? techHoursVal : undefined;
      await updateJobStatus(selectedJob.id, targetStatus, hours, {
        uid: currentUser.uid,
        fullName: currentUser.fullName
      });
      setSuccessMsg(`Status updated to ${targetStatus.toUpperCase()}!`);
      setUpdatingStatusFlag(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setUpdatingStatusFlag(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !newCommentText.trim()) return;

    try {
      await addJobComment(selectedJob.id, {
        id: `comment-${Date.now()}`,
        jobId: selectedJob.id,
        authorId: currentUser.uid,
        authorName: currentUser.fullName,
        authorRole: currentUser.role,
        text: newCommentText.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewCommentText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJob(jobToDelete.id);
      setSuccessMsg("Service ticket successfully deleted.");
      setJobToDelete(null);
      setSelectedJob(null);
      onRefresh();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete ticket.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-sans font-extrabold text-base tracking-tight text-slate-800 m-0">
            {isAdmin ? "Enterprise Service Ticket Dispatch" : "My Assigned Work Orders"}
          </h2>
          <p className="font-sans text-[11px] text-slate-400 m-0 mt-0.5">
            {isAdmin 
              ? "Oversee on-site dispatches, assign field technicians, assess logging times, and coordinate ticket resolution feeds." 
              : "Review your active dispatches, advance trouble tickets onsite, and input billable hours to automatically compile GA payroll earnings."}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Dispatch Ticket</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-sm font-sans flex items-center gap-3 animate-fadeIn shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dispatch form visible to admin only */}
      {showAddForm && isAdmin && (
        isSubmitting ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col items-center justify-center space-y-4 max-w-4xl min-h-[300px] animate-fadeIn">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Stationary FileText Icon */}
              <FileText className="w-8 h-8 text-indigo-500 relative z-10 animate-pulse" />
              {/* Rotating circle over the icon */}
              <div className="absolute inset-0 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center font-sans block">
              <h4 className="font-bold text-sm text-slate-800 m-0">Compiling Service Ticket Payload...</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Acquiring Georgia regional contractor slots & allocating ticket document...</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitJob}
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-xl space-y-4 max-w-4xl animate-fadeIn"
          >
            <div className="border-b border-slide-100 pb-2.5">
              <h3 className="font-sans font-bold text-lg text-slate-900 m-0">
                New Customer Installation & Diagnostic Dispatch
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-0.5">
                Enter the business site location, task descriptions, select the designated branch, and set payroll parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Designated Branch / Subsidiary
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Client Corporate Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Atlanta Botanical Gardens Office"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Onsite Service Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1345 Piedmont Ave NE, Atlanta, GA 30309"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Task Scope & Diagnostic Instructions
                </label>
                <textarea
                  placeholder="State the trouble description, expected hardware modules to replace, or configuration steps..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Assign Onsite Technician
                </label>
                <select
                  value={assignedTechId}
                  onChange={(e) => setAssignedTechId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                >
                  <option value="unassigned">-- Leave Unassigned / Standby --</option>
                  {employees
                    .filter((e) => e.role === "employee")
                    .map((e) => (
                      <option key={e.uid} value={e.uid}>
                        {e.fullName} (${Number(e.hourlyRate).toFixed(2)}/hr defaults)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Payment Framework
                  </label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                  >
                    <option value="hourly">Hourly Contract Pay</option>
                    <option value="flat">One-Time Flat Fee Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Rate of Pay ($)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="5000"
                    value={payRate}
                    onChange={(e) => setPayRate(Number(e.target.value))}
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
                Dispatch Ticket to Team
              </button>
            </div>
          </form>
        )
      )}

      {/* Tabs and filters */}
      <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-sm border border-slate-200 max-w-md">
        {["all", "pending", "onsite", "maintenance", "completed"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`flex-1 text-center py-1 px-2.5 rounded-xs text-[10px] font-bold capitalize font-sans transition-all cursor-pointer ${
              filterStatus === st
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {viewableJobs.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-sans text-slate-500 font-medium m-0">No active dispatches found matching this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {viewableJobs.map((job) => {
              const statusColors: Record<Job["status"], string> = {
                pending: "bg-amber-100 text-amber-800 border-amber-200",
                onsite: "bg-blue-100 text-blue-800 border-blue-200",
                maintenance: "bg-purple-100 text-purple-800 border-purple-200",
                completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
              };

              const isCompleted = job.status === "completed";

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer relative group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-indigo-600 block bg-indigo-50/70 border border-indigo-100/50 px-2.5 py-1 rounded-lg">
                        {job.id.toUpperCase()}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider font-mono border ${statusColors[job.status]}`}>
                        {job.status}
                      </span>
                    </div>

                    <h4 className="font-sans font-bold text-lg text-slate-900 leading-tight m-0 group-hover:text-indigo-600 transition-colors">
                      {job.clientName}
                    </h4>

                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-2.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-sans">{job.clientAddress}</span>
                    </div>

                    <p className="font-sans text-xs text-slate-500 leading-relaxed mt-3.5 line-clamp-2">
                      {job.description}
                    </p>
                  </div>

                  <div>
                    {/* Assigned label */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="font-sans text-xs font-semibold text-slate-600">
                        Assignee: <span className="text-slate-900 font-bold">{job.assignedTechName}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-xs font-sans text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          <span className="font-bold text-slate-700">
                            {job.payType === "hourly" 
                              ? `$${Number(job.payRate).toFixed(2)}/hr` 
                              : `$${Number(job.payRate).toFixed(2)} flat`
                            }
                          </span>
                        </span>
                        {job.loggedHours > 0 && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{job.loggedHours} hrs logged</span>
                          </span>
                        )}
                      </div>

                      {/* Comment Count badge */}
                      <span className="flex items-center gap-1 cursor-pointer bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{job.commentsCount || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Details Sub-Modal and Thread Chats */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end z-50 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full flex flex-col justify-between shadow-2xl animate-slideOver">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase">
                    {selectedJob.id}
                  </span>
                  <span className="font-sans text-xs text-slate-400">
                    Invoiced Branch: <span className="text-slate-800 font-semibold">{branches.find(b => b.id === selectedJob.branchId)?.name || selectedJob.branchId}</span>
                  </span>
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-900 m-0">
                  {selectedJob.clientName}
                </h3>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-sans text-slate-600">{selectedJob.clientAddress}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteJob(selectedJob)}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm px-3 duration-200 h-9"
                    title="Delete Ticket"
                    id="delete-ticket-button"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Delete Ticket</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer h-9 w-9 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Task Scope Card */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <h5 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-wider mb-2 m-0">
                  Onsite Diagnostic Tasks / Instructions
                </h5>
                <p className="font-sans text-sm text-slate-700 leading-relaxed m-0 whitespace-pre-wrap">
                  {selectedJob.description}
                </p>
              </div>

              {/* Status and Action Controls Section */}
              <div className="border-t border-b border-slate-100 py-6">
                <h5 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 m-0">
                  Dispatcher Order Progress
                </h5>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Current Status Label Indicator */}
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold">Current State</span>
                    <span className="inline-block mt-1.5 font-mono text-[11px] font-bold uppercase tracking-widest px-3 py-1 bg-indigo-50 text-indigo-800 border-l-4 border-indigo-600 rounded">
                      {selectedJob.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Operator Status Advance controls */}
                  <div className="space-y-3">
                    <span className="block text-xs text-slate-400 font-semibold text-right sm:text-left">Advance State</span>
                    <div className="flex items-center gap-2">
                      {selectedJob.status === "pending" && (
                        <button
                          onClick={() => handleStatusChange("onsite")}
                          className="px-4 py-2 bg-blue-600 text-white font-sans text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer shadow-sm"
                        >
                          Arrived Onsite
                        </button>
                      )}
                      {selectedJob.status === "onsite" && (
                        <button
                          onClick={() => handleStatusChange("maintenance")}
                          className="px-4 py-2 bg-purple-600 text-white font-sans text-xs font-semibold rounded-lg hover:bg-purple-700 cursor-pointer shadow-sm"
                        >
                          Perform Maintenance
                        </button>
                      )}
                      {(selectedJob.status === "maintenance" || selectedJob.status === "pending" || selectedJob.status === "onsite") && (
                        <div className="flex items-center gap-2">
                          {selectedJob.payType === "hourly" && (
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
                              <label className="text-[10px] text-slate-500 font-bold uppercase font-sans">Hrs Spent:</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={techHoursVal}
                                onChange={(e) => setTechHoursVal(Math.max(1, Number(e.target.value)))}
                                className="w-12 text-center bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:outline-none"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => handleStatusChange("completed")}
                            className="px-4 py-2 bg-emerald-600 text-white font-sans text-xs font-semibold rounded-lg hover:bg-emerald-700 cursor-pointer shadow-sm"
                          >
                            Mark Completed
                          </button>
                        </div>
                      )}

                      {selectedJob.status === "completed" && (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Order Resolved</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payroll and Georgia withholding statement overlay */}
                {selectedJob.status === "completed" && (
                  <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h6 className="font-sans font-extrabold text-xs text-slate-700 m-0 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>Automatic Atlanta Payroll Invoice Log</span>
                    </h6>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
                      <div>
                        <span className="block text-slate-400 font-semibold mb-0.5">Gross Pay</span>
                        <span className="font-mono text-slate-900 font-bold">${Number(selectedJob.grossPay).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-semibold mb-0.5">GA State (5.39%)</span>
                        <span className="font-mono text-slate-900 font-bold">${Number(selectedJob.taxState).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-semibold mb-0.5">Fed + FICA</span>
                        <span className="font-mono text-slate-900 font-bold">${Number(selectedJob.taxFederal + selectedJob.taxFica).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-extrabold text-indigo-600 mb-0.5">Net Salary</span>
                        <span className="font-mono text-indigo-600 font-extrabold border-b border-indigo-200 pb-0.5 font-bold">${Number(selectedJob.netPay).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Thread Comments chat list */}
              <div className="space-y-4">
                <h5 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-wider m-0">
                  Diagnostic Feed & Thread comments
                </h5>

                <div className="space-y-3.5 bg-slate-50/50 p-4 border border-slate-200/50 rounded-xl max-h-60 overflow-y-auto">
                  {activeComments.length === 0 ? (
                    <p className="text-xs font-sans text-slate-400 italic text-center py-4 m-0">
                      No status comments or dispatcher coordinates posted in this thread yet.
                    </p>
                  ) : (
                    activeComments.map((comment) => {
                      const isSelf = comment.authorId === currentUser.uid;
                      const isSysLog = comment.authorId === "system";

                      if (isSysLog) {
                        return (
                          <div key={comment.id} className="text-center font-mono text-[10px] text-indigo-600 bg-indigo-50/60 p-1.5 rounded border border-indigo-100/50 leading-relaxed">
                            {comment.text}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={comment.id}
                          className={`flex flex-col space-y-1 ${isSelf ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-center gap-1.5 max-w-[85%]">
                            <span className="font-sans text-[10px] font-bold text-slate-500">
                              {comment.authorName} ({comment.authorRole === "sup_admin" ? "Admin" : "Tech"})
                            </span>
                            <span className="font-mono text-[8px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`p-3 rounded-xl font-sans text-xs inline-block max-w-[85%] leading-relaxed ${
                            isSelf 
                              ? "bg-slate-900 text-white rounded-tr-none" 
                              : "bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm"
                          }`}>
                            {comment.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Comment Message Sender Footer */}
            <form onSubmit={handlePostComment} className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
              <input
                type="text"
                placeholder="Submit diagnostic update to coordinates thread..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern React-state-based Service Ticket Delete Confirmation Modal */}
      {jobToDelete && (
        <div id="job-delete-modal" className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fadeIn text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 rounded-full text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                  Delete Service Ticket
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Are you sure you want to permanently delete service ticket <span className="font-bold text-slate-800">{jobToDelete.id}</span>? This action is irreversible and will delete the record and its comments thread.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] font-mono text-slate-600 space-y-1">
              <div><span className="text-slate-400">CLIENT:</span> {jobToDelete.clientName}</div>
              <div><span className="text-slate-400">ADDRESS:</span> {jobToDelete.clientAddress}</div>
              <div><span className="text-slate-400">STATUS:</span> <span className="font-bold text-indigo-600 uppercase">{jobToDelete.status}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setJobToDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-sans text-xs font-bold rounded-lg transition-colors border border-transparent cursor-pointer"
                id="cancel-job-delete"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteJob}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold rounded-lg transition-all shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1.5"
                id="confirm-job-delete"
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
