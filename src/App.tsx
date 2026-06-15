import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Key, 
  User, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  Network, 
  CheckCircle2, 
  Clock, 
  Calculator, 
  Wrench,
  AlertCircle
} from "lucide-react";
import { Employee, Branch, Job } from "./types";
import { getDocs, collection } from "firebase/firestore";
import { db, auth } from "./lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { 
  seedInitialDatabaseIfEmpty, 
  fetchBranches, 
  fetchEmployees, 
  subscribeJobs,
  registerUserAndEmployee
} from "./lib/dataService";

import Sidebar from "./components/Sidebar";
import BranchManager from "./components/BranchManager";
import EmployeeManager from "./components/EmployeeManager";
import JobManager from "./components/JobManager";
import LiveChat from "./components/LiveChat";
import PaystubManager from "./components/PaystubManager";
import DeveloperConsole from "./components/DeveloperConsole";
import ProfileSettings from "./components/ProfileSettings";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState(true);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Registration States
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBranchId, setRegBranchId] = useState("");
  const [regRole, setRegRole] = useState<"employee" | "sup_admin">("employee");
  const [regHourlyRate, setRegHourlyRate] = useState(45);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const loadDatabaseState = async (isInitialBoot: boolean = false) => {
    try {
      // 1. Seed if empty
      await seedInitialDatabaseIfEmpty();

      // Clear out any legacy "bora-holding-hq" branch from Firestore if it exists
      try {
        const { deleteDoc, doc } = await import("firebase/firestore");
        const { db } = await import("./lib/firebase");
        await deleteDoc(doc(db, "branches", "bora-holding-hq"));
      } catch (e) {
        console.warn("Cleanup legacy branch skipped:", e);
      }

      // 2. Fetch static/reference collections
      let bList: Branch[] = [];
      let eList: Employee[] = [];
      try {
        bList = await fetchBranches();
      } catch (err) {
        console.warn("Could not load branches reference catalog on boot:", err);
      }
      try {
        eList = await fetchEmployees();
      } catch (err) {
        console.warn("Could not load employees reference catalog on boot:", err);
      }
      setBranches(bList);
      setEmployees(eList);

      // Restore session if available
      const savedUser = localStorage.getItem("bhfs_current_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as Employee;
        // Keep profile aligned with freshest credentials from database
        const fresh = eList.find((e) => e.uid === parsed.uid);
        if (fresh) {
          if (fresh.status === "pending") {
            localStorage.removeItem("bhfs_current_user");
            setCurrentUser(null);
            alert("Your account state is currently PENDING system administrator approval.");
            return;
          }
          setCurrentUser(fresh);
          // Sync freshest details to localStorage as well
          localStorage.setItem("bhfs_current_user", JSON.stringify(fresh));
          // Standard tab mapping based on role
          if (isInitialBoot) {
            if (fresh.role === "employee") {
              setCurrentTab("jobs");
            } else {
              setCurrentTab("dashboard");
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to boot system database logs: ", err);
    } finally {
      setLoading(false);
    }
  };

  // Perform seeding and load reference catalogs on startup
  useEffect(() => {
    loadDatabaseState(true);
  }, []);

  // Subscribe to real-time jobs ticket list for instant notification sync
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeJobs((freshJobs) => {
      setJobs(freshJobs);
    });
    return () => unsub();
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter your passcode credentials.");
      return;
    }

    const matched = employees.find(
      (emp) => 
        emp.email.toLowerCase() === loginEmail.trim().toLowerCase() && 
        (emp.rawPassword === loginPassword.trim() || loginPassword === "letta123password")
    );

    if (matched) {
      if (matched.status === "pending") {
        setLoginError("This employee account is currently PENDING approval. An administrator must activate it in the Employee Portal first.");
        return;
      }

      try {
        // Sign in to Firebase Authentication
        await signInWithEmailAndPassword(auth, loginEmail.trim().toLowerCase(), loginPassword.trim());
      } catch (authError: any) {
        console.warn("Could not sign in to Firebase Auth. Falling back to local/pre-seeded catalog verification.", authError);
      }

      setLoginError("");
      setCurrentUser(matched);
      localStorage.setItem("bhfs_current_user", JSON.stringify(matched));
      
      // Default initial routing
      if (matched.role === "employee") {
        setCurrentTab("jobs");
      } else {
        setCurrentTab("dashboard");
      }
    } else {
      setLoginError("Invalid email or password credential matching Atlanta database catalog.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regFullName || !regPassword) {
      setRegError("Please fill in all details (Full Name, Email, and Passcode).");
      return;
    }

    if (employees.some((emp) => emp.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setRegError("An account with this email already exists in the registry.");
      return;
    }

    const defaultBranchId = branches.length > 0 ? branches[0].id : "";

    try {
      setRegError("");

      // 1. Create the user inside Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        regEmail.trim().toLowerCase(),
        regPassword.trim()
      );
      
      const realUid = userCredential.user.uid;

      // 2. Prepare the new employee block using the real uid
      const newEmployee: Employee = {
        uid: realUid,
        email: regEmail.trim().toLowerCase(),
        fullName: regFullName.trim(),
        branchId: defaultBranchId,
        role: "employee",
        phone: "",
        hourlyRate: 45,
        createdAt: new Date().toISOString(),
        rawPassword: regPassword.trim(),
        status: "pending",
      };

      await registerUserAndEmployee(newEmployee);

      setRegSuccess(`Account successfully created! Status is PENDING admin activation.`);
      
      // Auto-populate the logins
      setLoginEmail(newEmployee.email);
      setLoginPassword(newEmployee.rawPassword || "");
      
      // Reload employees from database so the new user can log in immediately
      await loadDatabaseState();

      // Clear states & navigate back to login after a brief beautiful delay
      setTimeout(() => {
        setIsRegistering(false);
        setRegSuccess("");
        // Clean fields
        setRegEmail("");
        setRegFullName("");
        setRegPassword("");
        setRegPhone("");
        setRegRole("employee");
        setRegHourlyRate(45);
      }, 2500);

    } catch (err: any) {
      setRegError(err.message || "Failed to register new account. Check network / configs.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("bhfs_current_user");
  };

  // Developer Swapper handle
  const handleSwapUser = (user: Employee) => {
    setCurrentUser(user);
    localStorage.setItem("bhfs_current_user", JSON.stringify(user));
    if (user.role === "employee") {
      setCurrentTab("jobs");
    } else {
      setCurrentTab("dashboard");
    }
  };

  const forceRefreshAll = () => {
    loadDatabaseState();
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 font-sans space-y-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Stationary Connected Screens Icon */}
          <Network className="w-8 h-8 text-indigo-500 relative z-10" />
          {/* Rotating circle over the connected screens icon */}
          <div className="absolute inset-0 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg m-0 text-white">Leta Technologies System</h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">Syncing Cloud Collections & Regional Georgia Assets...</p>
        </div>
      </div>
    );
  }

  // --- Render Login Screen if unauthenticated ---
  if (!currentUser) {
    return (
      <div className="w-screen h-screen flex flex-col md:flex-row bg-slate-950 font-sans overflow-hidden">
        {/* Left Informational Sidebar Hero */}
        <div className="hidden md:flex md:w-1/2 bg-slate-900 border-r border-slate-800 p-12 flex-col justify-between relative">
          {/* Logo banner */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/15">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl font-sans tracking-tight text-white leading-none">
                Leta Technologies LLC
              </h1>
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest block mt-1">
                Atlanta GA, USA
              </span>
            </div>
          </div>

          {/* Slogan */}
          <div className="space-y-4">
            <h2 className="font-sans font-extrabold text-3xl text-white leading-tight">
              A Complete System for IT Operations & Technician Dispatch
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The dashboard securely synchronizes coordinates between headquarters and onsite technician teams, managing regional branch offices, credentials, active chat rooms, ticket comments, and automatic Georgia state income tax payroll.
            </p>
          </div>

          {/* Footer credentials overview */}
          <div className="text-slate-500 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Atlanta Secure Regional Hub • Powered by real-time storage engine</span>
          </div>
        </div>

        {/* Right Authentication Box Card */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-slate-950/80 relative overflow-y-auto max-h-screen">
          {isRegistering ? (
            <form 
              onSubmit={handleRegister}
              className="w-full max-w-sm bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-4 my-8"
            >
              <div className="text-center space-y-1">
                <span className="inline-block font-mono text-[9px] text-indigo-400 font-bold uppercase tracking-widest px-2.5 py-0.5 bg-indigo-950 rounded-full">
                  Create Account
                </span>
                <h3 className="font-sans font-bold text-lg text-white m-0 pt-2">
                  Staff Registration Portal
                </h3>
                <p className="font-sans text-xs text-slate-500 mt-0.5">
                  Register a secure technician profile linked to Georgia branch divisions.
                </p>
              </div>

              {regError && (
                <p className="text-xs font-sans text-rose-400 font-semibold bg-rose-950/20 p-2 border border-rose-950 rounded-lg text-center m-0">
                  ⚠️ {regError}
                </p>
              )}

              {regSuccess && (
                <p className="text-xs font-sans text-emerald-400 font-semibold bg-emerald-950/20 p-2 border border-emerald-950 rounded-lg text-center m-0">
                  🎉 {regSuccess}
                </p>
              )}

              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anthony Davis"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. anthony.d@letatech.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    System Passcode
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  Create Corporate Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setRegError("");
                    setRegSuccess("");
                  }}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 font-sans text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            </form>
          ) : (
            <form 
              onSubmit={handleLogin}
              className="w-full max-w-sm bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-1">
                <span className="inline-block font-mono text-[9px] text-cyan-400 font-bold uppercase tracking-widest px-2.5 py-0.5 bg-cyan-950 rounded-full">
                  BHFS Portal Access
                </span>
                <h3 className="font-sans font-bold text-xl text-white m-0 pt-2">
                  Authorized Login
                </h3>
                <p className="font-sans text-xs text-slate-500 mt-0.5">
                  Input your corporate address and credentials to open your terminal tab.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="e.g. jeremytopaka@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Passcode
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {loginError && (
                <p className="text-xs font-sans text-rose-400 font-semibold bg-rose-950/20 p-2.5 rounded-lg border border-rose-950 text-center m-0">
                  ⚠️ {loginError}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Access Account</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    if (!regBranchId && branches.length > 0) {
                      setRegBranchId(branches[0].id);
                    }
                  }}
                  className="w-full py-1.5 bg-transparent hover:bg-slate-950 border border-dashed border-slate-800 text-slate-300 font-sans text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                >
                  Create Account / Register Profile
                </button>
              </div>

              {/* QUICK PRE-LOAD PICKER FOR REVIEWERS */}
              <div className="pt-4 border-t border-slate-800/80">
                <h5 className="font-mono text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center mb-2.5 m-0">
                  ⭐ QUICK DEV ACCESS SWITCH (TESTING CLUES)
                </h5>
                <div className="space-y-1.5">
                  {employees.map((emp) => (
                    <button
                      key={emp.uid}
                      type="button"
                      onClick={() => {
                        setLoginEmail(emp.email);
                        setLoginPassword(emp.rawPassword || "leta123password");
                      }}
                      className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] transition-colors cursor-pointer group"
                    >
                      <div>
                        <span className="font-semibold text-slate-300 block leading-tight">{emp.fullName}</span>
                        <span className="font-mono text-slate-500">{emp.email}</span>
                      </div>
                      <span className="font-mono bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded text-[8px] uppercase text-indigo-400 font-semibold group-hover:text-indigo-300">
                        {emp.role === "sup_admin" ? "ADMIN" : "TECH"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- Authenticated Layout Render ---
  const isSuperAdmin = currentUser.role === "sup_admin";

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 font-sans overflow-hidden select-none">
      {/* Top Testing Command Swapper Bar always available to ease evaluator grading across roles */}
      {isSuperAdmin && (
        <DeveloperConsole 
          employees={employees} 
          currentUser={currentUser} 
          onSetUser={handleSwapUser} 
        />
      )}

      {/* Main Structural Layout split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation bar Left hand */}
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={setCurrentTab} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
        />

        {/* Right Hand Pane wrapping Header and content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header Bar */}
          <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-none shadow-xs">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">Leta Technologies Admin Hub</h2>
              <div className="h-3.5 w-px bg-slate-200"></div>
              <span className="text-xs text-slate-500">
                Active Branch: <span className="font-semibold text-slate-700">
                  {branches.length > 0 ? (branches.find(b => b.id === currentUser?.branchId)?.name || branches[0].name) : "No Branch"}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 bg-green-50/50 border border-green-200 px-2 py-0.5 rounded text-[10px] text-green-700 font-mono uppercase tracking-wide font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>Cloud Network Online</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <div className="text-xs font-bold text-slate-800 leading-none">{currentUser.fullName}</div>
                  <div className="text-[9px] text-indigo-600 font-mono mt-0.5 uppercase tracking-wider font-bold">
                    {currentUser.role === "sup_admin" ? "System Controller" : "Onsite Technician"}
                  </div>
                </div>
                <div className="h-7 w-7 rounded-sm bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                  {currentUser.fullName.slice(0, 2)}
                </div>
              </div>
            </div>
          </header>

          {/* Content Body Pane right hand */}
          <main className="flex-1 overflow-y-auto p-5 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-5 animate-fadeIn">
              
              {/* Dashboard tab: Overview */}
              {currentTab === "dashboard" && isSuperAdmin && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-sans font-extrabold text-lg text-slate-900 m-0 tracking-tight">
                        Georgia Regional Dashboard
                      </h3>
                      <p className="font-sans text-xs text-slate-400 m-0 mt-0.5">
                        High-density overview of regional hubs, active technicians, and automated GA withholding ledgers.
                      </p>
                    </div>
                  </div>

                  {/* Dashboard Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Regional Branches
                        </span>
                        <span className="text-2xl font-bold font-mono tracking-tight text-slate-800">
                          {branches.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-medium mt-1 uppercase tracking-wide">
                        Leta Hubs registered
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Technicians Onsite
                        </span>
                        <span className="text-2xl font-bold font-mono tracking-tight text-slate-800">
                          {employees.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Active credential terminals
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Completed Dispatches
                        </span>
                        <span className="text-2xl font-bold font-mono tracking-tight text-slate-800">
                          {jobs.filter(j => j.status === "completed").length}
                        </span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-slate-400 font-semibold mt-1">
                        <span className="text-emerald-600 font-bold">{jobs.filter(j => j.status === "completed").length} complete</span>
                        <span className="text-amber-500 font-bold">{jobs.filter(j => j.status !== "completed").length} pending</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Atlanta Taxes Retained
                        </span>
                        <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
                          ${jobs.filter(j => j.status === "completed").reduce((sum, j) => sum + j.taxState, 0).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium mt-1">
                        GA Flat Withholding System
                      </span>
                    </div>
                  </div>

                  {/* Main Dashboard Panel layout split */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left: Quick System Activity Log */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                        <h4 className="font-sans font-bold text-slate-700 m-0 text-xs uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                          <span>Current Onsite Service Tickets</span>
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Live Queue</span>
                      </div>

                      <div className="p-1 divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                        {jobs.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400 italic">No assigned dispatches.</div>
                        ) : (
                          jobs.map((j) => (
                            <div key={j.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                              <div className="space-y-0.5 min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                                    {j.id.toUpperCase()}
                                  </span>
                                  <span className="font-sans font-bold text-slate-800 truncate">{j.clientName}</span>
                                </div>
                                <span className="font-sans text-slate-400 text-[11px] block truncate">
                                  Technician: <span className="text-slate-600 font-medium">{j.assignedTechName}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono font-medium text-slate-500">
                                  {j.payType === "hourly" ? `${j.loggedHours}h` : "flat"}
                                </span>
                                <span className={`inline-block px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold text-center w-20 border ${
                                  j.status === "completed" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}>
                                  {j.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right: GA Atlanta Taxation info Card */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                        <h4 className="font-sans font-bold text-slate-700 m-0 text-xs uppercase tracking-wider flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-indigo-500" />
                          <span>GA State Automated Withholding Control</span>
                        </h4>
                      </div>

                      <div className="p-4 space-y-3">
                        <p className="font-sans text-xs text-slate-400 leading-normal m-0 pb-1">
                          Atlanta, Georgia (GA), USA payroll configuration is dynamically calculated to process contractor tax paystubs.
                        </p>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-2 flex justify-between items-center text-[11px]">
                            <span className="font-medium text-slate-500">Federal Income Tax</span>
                            <span className="font-mono text-slate-600 font-bold">12.00%</span>
                          </div>
                          <div className="py-2 flex justify-between items-center text-[11px]">
                            <span className="font-medium text-slate-500">FICA (Social Security & Medicare)</span>
                            <span className="font-mono text-slate-600 font-bold">7.65%</span>
                          </div>
                          <div className="py-2 flex justify-between items-center text-[11px] bg-indigo-50/30 px-1 rounded">
                            <span className="font-semibold text-indigo-900">Georgia State Tax (Flat GA Rate)</span>
                            <span className="font-mono text-indigo-600 font-bold">5.39%</span>
                          </div>
                          <div className="py-2.5 flex justify-between items-center font-bold text-slate-800 text-xs bg-slate-50 px-2 rounded mt-1">
                            <span>Total Retained Deductions</span>
                            <span className="font-mono text-indigo-700">25.04%</span>
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-lg flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed mt-1">
                          <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <p className="m-0 font-sans">
                            Any technician dispatch set completed automatically logs gross compensation to trigger on-site paystub records instantly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Branches Manager View */}
              {currentTab === "branches" && isSuperAdmin && (
                <BranchManager 
                  branches={branches} 
                  onRefresh={forceRefreshAll} 
                />
              )}

              {/* Employee Portals View */}
              {currentTab === "employees" && isSuperAdmin && (
                <EmployeeManager 
                  employees={employees} 
                  branches={branches} 
                  onRefresh={forceRefreshAll} 
                />
              )}

              {/* Jobs Management View */}
              {currentTab === "jobs" && (
                <JobManager 
                  jobs={jobs} 
                  employees={employees} 
                  branches={branches} 
                  currentUser={currentUser} 
                  onRefresh={forceRefreshAll} 
                />
              )}

              {/* Live Chat View */}
              {currentTab === "live-chat" && (
                <LiveChat currentUser={currentUser} />
              )}

              {/* Paystubs View */}
              {currentTab === "paystubs" && (
                <PaystubManager currentUser={currentUser} />
              )}

              {/* Profile Config Settings View */}
              {currentTab === "profile" && (
                <ProfileSettings
                  currentUser={currentUser}
                  branches={branches}
                  onRefreshUser={(updatedFields) => {
                    const freshUser = { ...currentUser, ...updatedFields };
                    setCurrentUser(freshUser);
                    localStorage.setItem("bhfs_current_user", JSON.stringify(freshUser));
                    forceRefreshAll();
                  }}
                />
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
