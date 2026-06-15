import React, { useState, useRef } from "react";
import { Camera, Upload, UserSquare2, Save, Phone, Shield, Trash2, Video, VideoOff, CheckCircle2, RefreshCw } from "lucide-react";
import { Employee, Branch } from "../types";
import { updateEmployee } from "../lib/dataService";

interface ProfileSettingsProps {
  currentUser: Employee;
  branches: Branch[];
  onRefreshUser: (updatedUser: Partial<Employee>) => void;
}

export default function ProfileSettings({ currentUser, branches, onRefreshUser }: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(currentUser.fullName || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || "");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get user's branch name
  const matchedBranch = branches.find((b) => b.id === currentUser.branchId);
  const branchName = matchedBranch ? matchedBranch.name : currentUser.branchId;

  // File Upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1048576) { // 1MB Limit for Base64 document persistence
      setErrorMsg("Image is too large. Please select a profile picture under 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoURL(reader.result);
        setErrorMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera Management
  const startCamera = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setErrorMsg("Could not access camera. Please verify device permissions in your browser or iframe.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");

    if (ctx && videoRef.current) {
      // Draw centered square crop from video feed
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setPhotoURL(dataUrl);
        stopCamera();
        setErrorMsg("");
      } catch (err: any) {
        setErrorMsg("Failed to capture picture matrix. Use file upload instead.");
      }
    }
  };

  const clearPhoto = () => {
    setPhotoURL("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg("Full Name and Contact Phone are required.");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await updateEmployee(currentUser.uid, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        photoURL: photoURL,
      });

      // Notify parent wrapper to update cached localStorage context and active states
      onRefreshUser({
        fullName: fullName.trim(),
        phone: phone.trim(),
        photoURL: photoURL,
      });

      setSuccessMsg("Your personal account configuration and avatar profile photo have been updated successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-150 pb-3">
        <h2 className="font-sans font-extrabold text-base tracking-tight text-slate-800 m-0">
          Account & Profile Customization
        </h2>
        <p className="font-sans text-[11px] text-slate-400 m-0 mt-0.5">
          Edit your legal identity details, contact information, and configure your visual system avatar.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-sans animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs font-sans text-rose-600 font-semibold bg-rose-50 p-3 rounded-lg border border-rose-100 animate-fadeIn">
          ⚠️ {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Photo configuration Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col items-center text-center space-y-4">
          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-500 w-full text-left border-b border-slate-100 pb-2">
            Identity Card Avatar
          </h3>

          <div className="relative group mt-2">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile Preview"
                referrerPolicy="no-referrer"
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 shadow-md group-hover:brightness-90 transition-all"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-indigo-50 border-4 border-slate-100 shadow-inner text-indigo-500 flex items-center justify-center flex-col shrink-0">
                <UserSquare2 className="w-12 h-12 stroke-[1.5]" />
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-indigo-400 mt-1">
                  Unset Custom
                </span>
              </div>
            )}

            {photoURL && (
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md hover:scale-105 transition-all shrink-0 cursor-pointer"
                title="Remove Photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="font-sans text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
            Upload a high-fidelity JPG/PNG file (max 1MB) or use your device camera to capture an instant snapshot.
          </p>

          {/* Interactive Camera Container */}
          {cameraActive ? (
            <div className="w-full bg-slate-900 rounded-lg p-2.5 space-y-2 border border-slate-800 animate-fadeIn">
              <div className="overflow-hidden rounded border border-slate-700 bg-black aspect-square max-w-[200px] mx-auto">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  muted
                />
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-sans text-[10px] font-bold rounded shadow transition-all cursor-pointer"
                >
                  Capture Picture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1 bg-slate-705 hover:bg-slate-600 text-slate-300 font-sans text-[10px] font-bold rounded cursor-pointer"
                  title="Stop Camera Device"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full pt-2">
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 hover:border-indigo-550 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/20 text-xs font-bold tracking-tight shadow-2xs transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload From Device</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 hover:border-cyan-550 rounded-lg text-slate-600 hover:text-cyan-600 hover:bg-cyan-50/20 text-xs font-bold tracking-tight shadow-2xs transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Use System Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Primary Info Fields */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Legal Profile Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Corporate Email Address
              </label>
              <input
                type="text"
                value={currentUser.email}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono text-slate-400 cursor-not-allowed outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Legal Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 focus:border-indigo-500 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Assigned Corporate Branch
              </label>
              <input
                type="text"
                value={`${branchName} (${currentUser.branchId})`}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-sans text-slate-400 cursor-not-allowed outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Contact Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="+1 (404) 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 focus:border-indigo-500 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-all font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-500 pt-3 border-b border-slate-100 pb-2">
            System Privileges & Comp State
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Security Access
                </span>
                <span className="font-mono text-xs font-extrabold text-indigo-805 uppercase mt-0.5 inline-block">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                $
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Default Hourly Rate
                </span>
                <span className="font-mono text-xs font-extrabold text-slate-805 mt-0.5 inline-block">
                  ${currentUser.hourlyRate || 45.0}/hr
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Account Status
                </span>
                <span className="font-sans text-xs font-extrabold text-teal-700 mt-0.5 inline-block capitalize">
                  {currentUser.status || "active"} Status
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold tracking-tight rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Profiles...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
