import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  increment,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { Branch, Employee, Job, TicketComment, ChatMessage, Paystub, calculateDeductions, UserRole } from "../types";

// Active collection names
const BRANCHES_COL = "branches";
const EMPLOYEES_COL = "employees";
const JOBS_COL = "jobs";
const CHATS_COL = "chats";
const PAYSTUBS_COL = "paystubs";

// --- Branch Management ---
export async function createBranch(branch: Omit<Branch, "createdAt">): Promise<void> {
  const path = `${BRANCHES_COL}/${branch.id}`;
  try {
    const docRef = doc(db, BRANCHES_COL, branch.id);
    await setDoc(docRef, {
      ...branch,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const listSnapshot = await getDocs(collection(db, BRANCHES_COL));
    const result: Branch[] = [];
    listSnapshot.forEach((doc) => {
      result.push(doc.data() as Branch);
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, BRANCHES_COL);
    return [];
  }
}

export async function deleteBranch(branchId: string): Promise<void> {
  const path = `${BRANCHES_COL}/${branchId}`;
  try {
    const docRef = doc(db, BRANCHES_COL, branchId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Employee Management ---
export async function createEmployee(emp: Employee): Promise<void> {
  const path = `${EMPLOYEES_COL}/${emp.uid}`;
  try {
    const payload = {
      ...emp,
      createdAt: emp.createdAt || new Date().toISOString(),
    };
    // Save to employees collection
    const empDocRef = doc(db, EMPLOYEES_COL, emp.uid);
    await setDoc(empDocRef, payload);

    // Save to users collection
    const userDocRef = doc(db, "users", emp.uid);
    await setDoc(userDocRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function registerUserAndEmployee(emp: Employee): Promise<void> {
  const path = `${EMPLOYEES_COL}/${emp.uid}`;
  try {
    const payload = {
      ...emp,
      createdAt: emp.createdAt || new Date().toISOString(),
    };
    // Save to employees collection
    const empDocRef = doc(db, EMPLOYEES_COL, emp.uid);
    await setDoc(empDocRef, payload);

    // Save to users collection
    const userDocRef = doc(db, "users", emp.uid);
    await setDoc(userDocRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const empMap = new Map<string, Employee>();

    // 1. Fetch from employees collection
    try {
      const empSnapshot = await getDocs(collection(db, EMPLOYEES_COL));
      empSnapshot.forEach((doc) => {
        const data = doc.data() as Employee;
        if (data.uid) {
          empMap.set(data.uid, data);
        }
      });
    } catch (e) {
      console.warn("Could not fetch from employees collection", e);
    }

    // 2. Fetch from users collection
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      usersSnapshot.forEach((doc) => {
        const data = doc.data() as Employee;
        const uid = data.uid || doc.id;
        const existing = empMap.get(uid);
        if (existing) {
          empMap.set(uid, {
            ...existing,
            ...data,
            uid,
          });
        } else {
          empMap.set(uid, {
            ...data,
            uid,
          });
        }
      });
    } catch (e) {
      console.warn("Could not fetch from users collection", e);
    }

    const list: Employee[] = [];
    empMap.forEach((emp) => {
      // Default unset status to 'active' for legacy or pre-seeded entries if needed, or keep as is
      list.push({
        status: "active",
        ...emp,
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, EMPLOYEES_COL);
    return [];
  }
}

export async function updateEmployee(uid: string, updated: Partial<Employee>): Promise<void> {
  const path = `${EMPLOYEES_COL}/${uid}`;
  try {
    const empDocRef = doc(db, EMPLOYEES_COL, uid);
    await updateDoc(empDocRef, updated);

    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, updated);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEmployee(uid: string): Promise<void> {
  const path = `${EMPLOYEES_COL}/${uid}`;
  try {
    const empDocRef = doc(db, EMPLOYEES_COL, uid);
    await deleteDoc(empDocRef);

    const userDocRef = doc(db, "users", uid);
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Jobs / Tickets ---
export async function createJob(job: Omit<Job, "createdAt" | "completedAt" | "commentsCount" | "grossPay" | "taxFica" | "taxState" | "taxFederal" | "netPay">): Promise<void> {
  const path = `${JOBS_COL}/${job.id}`;
  try {
    const docRef = doc(db, JOBS_COL, job.id);
    const grossVal = job.payType === "flat" ? job.payRate : (job.payRate * job.loggedHours);
    const deductions = calculateDeductions(grossVal);

    await setDoc(docRef, {
      ...job,
      loggedHours: job.loggedHours || 0,
      grossPay: grossVal,
      taxFica: deductions.ficaSS + deductions.ficaMC,
      taxState: deductions.gaState,
      taxFederal: deductions.federal,
      netPay: deductions.netPay,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateJobStatus(
  jobId: string, 
  status: Job["status"], 
  loggedHours?: number,
  currentUser?: { uid: string; fullName: string }
): Promise<void> {
  const path = `${JOBS_COL}/${jobId}`;
  try {
    const docRef = doc(db, JOBS_COL, jobId);
    const jobSnap = await getDoc(docRef);
    if (!jobSnap.exists()) return;

    const data = jobSnap.data() as Job;
    const updatePayload: Partial<Job> = { status };

    if (status === "completed") {
      updatePayload.completedAt = new Date().toISOString();
    }

    if (loggedHours !== undefined && data.payType === "hourly") {
      updatePayload.loggedHours = loggedHours;
      const grossVal = data.payRate * loggedHours;
      const deductions = calculateDeductions(grossVal);

      updatePayload.grossPay = grossVal;
      updatePayload.taxFica = deductions.ficaSS + deductions.ficaMC;
      updatePayload.taxState = deductions.gaState;
      updatePayload.taxFederal = deductions.federal;
      updatePayload.netPay = deductions.netPay;

      // Automatically issue an approved Paystub upon completion of a task!
      const paystubId = `stub-${jobId}`;
      const stubRef = doc(db, PAYSTUBS_COL, paystubId);
      await setDoc(stubRef, {
        id: paystubId,
        employeeId: data.assignedTechId,
        employeeName: data.assignedTechName,
        jobId: data.id,
        jobDescription: data.description,
        payDate: new Date().toISOString(),
        payType: data.payType,
        payRate: data.payRate,
        loggedHours: loggedHours,
        grossPay: grossVal,
        taxFicaSocialSecurity: deductions.ficaSS,
        taxFicaMedicare: deductions.ficaMC,
        taxGAState: deductions.gaState,
        taxFederal: deductions.federal,
        netPay: deductions.netPay,
        status: "approved",
      });
    } else if (status === "completed" && data.payType === "flat") {
      // Create Flat Fee paystub
      const grossVal = data.payRate;
      const deductions = calculateDeductions(grossVal);
      const paystubId = `stub-${jobId}`;
      const stubRef = doc(db, PAYSTUBS_COL, paystubId);
      await setDoc(stubRef, {
        id: paystubId,
        employeeId: data.assignedTechId,
        employeeName: data.assignedTechName,
        jobId: data.id,
        jobDescription: data.description,
        payDate: new Date().toISOString(),
        payType: data.payType,
        payRate: data.payRate,
        loggedHours: 0,
        grossPay: grossVal,
        taxFicaSocialSecurity: deductions.ficaSS,
        taxFicaMedicare: deductions.ficaMC,
        taxGAState: deductions.gaState,
        taxFederal: deductions.federal,
        netPay: deductions.netPay,
        status: "approved",
      });
    }

    await updateDoc(docRef, updatePayload);

    // If an update is triggered, let's leave an automated system ticket comment
    const actorName = currentUser ? currentUser.fullName : "System";
    const statusMsg = `Status changed to [ ${status.toUpperCase()} ]${loggedHours !== undefined ? ` with h: ${loggedHours}` : ""}.`;
    await addJobComment(jobId, {
      id: `system-log-${Date.now()}`,
      jobId,
      authorId: currentUser?.uid || "system",
      authorName: actorName,
      authorRole: currentUser?.uid === data.assignedTechId ? "employee" : "sup_admin",
      text: `🔧 ${statusMsg}`,
      createdAt: new Date().toISOString(),
    });

  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  const path = `${JOBS_COL}/${jobId}`;
  try {
    const docRef = doc(db, JOBS_COL, jobId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reassignJob(
  jobId: string,
  techId: string,
  techName: string,
  currentUser?: { uid: string; fullName: string }
): Promise<void> {
  const path = `${JOBS_COL}/${jobId}`;
  try {
    const docRef = doc(db, JOBS_COL, jobId);
    await updateDoc(docRef, {
      assignedTechId: techId,
      assignedTechName: techName,
    });

    const actorName = currentUser ? currentUser.fullName : "System";
    await addJobComment(jobId, {
      id: `system-log-reassign-${Date.now()}`,
      jobId,
      authorId: currentUser?.uid || "system",
      authorName: actorName,
      authorRole: "sup_admin",
      text: `👥 Reassigned ticket to: ${techName}`,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeJobs(callback: (jobs: Job[]) => void): Unsubscribe {
  const q = query(collection(db, JOBS_COL), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Job[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Job);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, JOBS_COL);
    }
  );
}

export function subscribeEmployees(callback: (employees: Employee[]) => void): Unsubscribe {
  const q = collection(db, EMPLOYEES_COL);
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Employee[] = [];
      snapshot.forEach((doc) => {
        list.push({
          status: "active",
          ...doc.data() as Employee,
        });
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, EMPLOYEES_COL);
    }
  );
}

// --- Ticket Chat & Comments ---
export async function addJobComment(jobId: string, comment: TicketComment): Promise<void> {
  const path = `${JOBS_COL}/${jobId}/comments/${comment.id}`;
  try {
    const commentsColRef = collection(db, JOBS_COL, jobId, "comments");
    const commentDocRef = doc(commentsColRef, comment.id);
    await setDoc(commentDocRef, {
      ...comment,
      createdAt: new Date().toISOString(),
    });

    // Update comment counter in main job
    const jobDocRef = doc(db, JOBS_COL, jobId);
    await updateDoc(jobDocRef, {
      commentsCount: increment(1),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeJobComments(jobId: string, callback: (comments: TicketComment[]) => void): Unsubscribe {
  const commentsColRef = collection(db, JOBS_COL, jobId, "comments");
  const q = query(commentsColRef, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TicketComment[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as TicketComment);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `comments_for_job_${jobId}`);
    }
  );
}

// --- General Live chat portal ---
export async function sendLiveChatMessage(msg: Omit<ChatMessage, "createdAt">): Promise<void> {
  const path = `${CHATS_COL}/${msg.id}`;
  try {
    const docRef = doc(db, CHATS_COL, msg.id);
    await setDoc(docRef, {
      ...msg,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeLiveChat(callback: (messages: ChatMessage[]) => void): Unsubscribe {
  const q = query(collection(db, CHATS_COL), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as ChatMessage);
      });
      // Restrict maximum active messages locally to prevent denial of wallet
      callback(list.slice(-150));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CHATS_COL);
    }
  );
}

// --- Paystubs Service ---
export async function approvePaystub(stubId: string): Promise<void> {
  const path = `${PAYSTUBS_COL}/${stubId}`;
  try {
    const docRef = doc(db, PAYSTUBS_COL, stubId);
    await updateDoc(docRef, { status: "processed" });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribePaystubs(callback: (stubs: Paystub[]) => void): Unsubscribe {
  const q = query(collection(db, PAYSTUBS_COL), orderBy("payDate", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Paystub[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Paystub);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PAYSTUBS_COL);
    }
  );
}

// --- Core Database Auto-Seeding Handler ---
export async function seedInitialDatabaseIfEmpty(): Promise<void> {
  try {
    const employeesSnap = await getDocs(collection(db, EMPLOYEES_COL));
    if (!employeesSnap.empty) {
      console.log("Database already has content, skipping system auto-seed.");
      return;
    }

    console.log("Empty database detected. Auto-seeding default employees and jobs...");

    // 1. Create Default Branches - Enabled only for user manual additions as requested
    const seedBranches: Branch[] = [];
    for (const b of seedBranches) {
      await createBranch(b);
    }

    // 2. Create Default Employees (Assigned to empty branch under default initialization)
    const seedEmployees: Employee[] = [
      {
        uid: "user-admin",
        email: "jeremytopaka@gmail.com",
        fullName: "Jeremy Topaka",
        branchId: "",
        role: "sup_admin",
        phone: "+1 (404) 555-0100",
        hourlyRate: 120,
        createdAt: new Date().toISOString(),
        rawPassword: "adminpassword",
        status: "active",
      },
      {
        uid: "tech-marcus",
        email: "marcus.v@letatech.com",
        fullName: "Marcus Vance",
        branchId: "",
        role: "employee",
        phone: "+1 (404) 555-0145",
        hourlyRate: 45.0,
        createdAt: new Date().toISOString(),
        rawPassword: "leta123password",
        status: "active",
      },
      {
        uid: "tech-sarah",
        email: "sarah.j@letatech.com",
        fullName: "Sarah Jenkins",
        branchId: "",
        role: "employee",
        phone: "+1 (404) 555-0199",
        hourlyRate: 50.0,
        createdAt: new Date().toISOString(),
        rawPassword: "leta123password",
        status: "active",
      },
    ];
    for (const e of seedEmployees) {
      await createEmployee(e);
    }

    // 3. Create Default Job Tickets
    const seedJobs: Job[] = [
      {
        id: "job-101",
        branchId: "",
        clientName: "Peachtree Medical Center",
        clientAddress: "194 Peachtree St NW, Atlanta, GA",
        description: "Onsite Repair: Pharmacy computer terminal won't boot past BIOS. Check hard drive or motherboard capacitor swelling.",
        assignedTechId: "tech-marcus",
        assignedTechName: "Marcus Vance",
        status: "completed",
        payType: "hourly",
        payRate: 45.0,
        loggedHours: 6,
        grossPay: 270.0,
        taxFica: 20.66,
        taxState: 14.55,
        taxFederal: 32.40,
        netPay: 202.39,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        completedAt: new Date(Date.now() - 86400000 * 2 + 3600000 * 6).toISOString(),
        commentsCount: 2,
      },
      {
        id: "job-102",
        branchId: "",
        clientName: "Atlanta Legal Partners",
        clientAddress: "1100 Peachtree St NE #2400, Atlanta, GA 30309",
        description: "Network Maintenance: Relocate corporate router and install 4 enterprise wireless access points (Ubiquiti U6 Pro). Configure safe guest isolation VLANS.",
        assignedTechId: "tech-sarah",
        assignedTechName: "Sarah Jenkins",
        status: "onsite",
        payType: "flat",
        payRate: 450.00,
        loggedHours: 0,
        grossPay: 450.0,
        taxFica: 34.43,
        taxState: 24.26,
        taxFederal: 54.00,
        netPay: 337.31,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        completedAt: null,
        commentsCount: 1,
      },
      {
        id: "job-103",
        branchId: "",
        clientName: "Atlanta Botanical Garden",
        clientAddress: "1345 Piedmont Ave NE, Atlanta, GA 30309",
        description: "Troubleshooting: Fiber optic backup switch remains offline after intense thunderstorm surge. Technician requested to bypass or replace unit with cold spare.",
        assignedTechId: "tech-marcus",
        assignedTechName: "Marcus Vance",
        status: "pending",
        payType: "hourly",
        payRate: 45.0,
        loggedHours: 0,
        grossPay: 0,
        taxFica: 0,
        taxState: 0,
        taxFederal: 0,
        netPay: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
        commentsCount: 0,
      },
    ];

    for (const j of seedJobs) {
      const docRef = doc(db, JOBS_COL, j.id);
      await setDoc(docRef, j);

      // Create pre-loaded comments for Job 101 to represent a real exchange
      if (j.id === "job-101") {
        const comments = [
          {
            id: "cmt-1",
            jobId: j.id,
            authorId: "tech-marcus",
            authorName: "Marcus Vance",
            authorRole: "employee" as UserRole,
            text: "Arrived onsite. Standard hardware diagnostics show bad SATA connection cable. Swapping with a high-grade cable.",
            createdAt: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
          },
          {
            id: "cmt-2",
            jobId: j.id,
            authorId: "user-admin",
            authorName: "Jeremy Topaka",
            authorRole: "sup_admin" as UserRole,
            text: "Nice job Marcus. Ensure they sign the tech completion receipt form.",
            createdAt: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
          },
        ];
        for (const c of comments) {
          await setDoc(doc(collection(db, JOBS_COL, j.id, "comments"), c.id), c);
        }
      } else if (j.id === "job-102") {
        await setDoc(doc(collection(db, JOBS_COL, j.id, "comments"), "cmt-3"), {
          id: "cmt-3",
          jobId: j.id,
          authorId: "tech-sarah",
          authorName: "Sarah Jenkins",
          authorRole: "employee" as UserRole,
          text: "VLAN mappings completed. Commencing hardware deployment on 2nd floor.",
          createdAt: new Date(Date.now() - 86400000 * 1 + 5000000).toISOString(),
        });
      }
    }

    // 4. Create Pre-loaded Paystubs for the complete Job 101
    const seedPaystub: Paystub = {
      id: "stub-job-101",
      employeeId: "tech-marcus",
      employeeName: "Marcus Vance",
      jobId: "job-101",
      jobDescription: "Onsite Repair: Pharmacy computer terminal Peachtree Medical",
      payDate: new Date(Date.now() - 86400000 * 2 + 3600000 * 6).toISOString(),
      payType: "hourly",
      payRate: 45.0,
      loggedHours: 6,
      grossPay: 270.0,
      taxFicaSocialSecurity: 16.74, // 6.2%
      taxFicaMedicare: 3.92,       // 1.45%
      taxGAState: 14.55,           // 5.39% GA State
      taxFederal: 32.40,           // 12% Fed
      netPay: 202.39,
      status: "processed",
    };
    await setDoc(doc(db, PAYSTUBS_COL, seedPaystub.id), seedPaystub);

    // 5. Create some seed chat messages
    const seedChats: ChatMessage[] = [
      {
        id: "chat-1",
        senderId: "tech-marcus",
        senderName: "Marcus Vance",
        senderRole: "employee",
        text: "Hi support branch, just completed my Atlanta botanical switch setup! Please check my completed work invoice.",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "chat-2",
        senderId: "user-admin",
        senderName: "Jeremy Topaka",
        senderRole: "sup_admin",
        text: "Reviewing right now, Marcus. I will approve and mark your hours on the system tracker so taxes and pay calculations reflect.",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    for (const c of seedChats) {
      await setDoc(doc(db, CHATS_COL, c.id), c);
    }

    console.log("Database auto-seeding completed successfully!");
  } catch (error) {
    console.error("An error occurred while seeding: ", error);
  }
}
