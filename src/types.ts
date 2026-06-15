export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  createdAt: string;
}

export type UserRole = "sup_admin" | "employee";

export interface Employee {
  uid: string;
  email: string;
  fullName: string;
  branchId: string;
  role: UserRole;
  phone: string;
  hourlyRate: number;
  createdAt: string;
  rawPassword?: string; // Stored securely in profile metadata for simulated direct login
  status?: "active" | "pending";
  photoURL?: string;
  isOnline?: boolean;
  isOnBreak?: boolean;
  breakStartedAt?: string;
  breakEndedAt?: string;
}

export interface Job {
  id: string;
  branchId: string;
  clientName: string;
  clientAddress: string;
  description: string;
  assignedTechId: string; // references Employee.uid, or "unassigned"
  assignedTechName: string;
  status: "pending" | "onsite" | "maintenance" | "completed";
  payType: "hourly" | "flat";
  payRate: number; // hourly rate or flat fee
  loggedHours: number; // only relevant if payType is hourly
  grossPay: number; // autocalculated
  taxFica: number;  // 7.65% total (6.2% SS + 1.45% Medicare)
  taxState: number; // GA Flat State Tax 5.39%
  taxFederal: number; // Federal Standard Withholding 12.00%
  netPay: number; // gross - FICA - State - Federal
  createdAt: string;
  startedAt?: string | null;
  completedAt: string | null;
  commentsCount: number;
}

export interface TicketComment {
  id: string;
  jobId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
}

export interface Paystub {
  id: string;
  employeeId: string;
  employeeName: string;
  jobId: string;
  jobDescription: string;
  payDate: string;
  payType: "hourly" | "flat";
  payRate: number;
  loggedHours?: number;
  grossPay: number;
  taxFicaSocialSecurity: number; // 6.2%
  taxFicaMedicare: number; // 1.45%
  taxGAState: number; // 5.39% flat GA State Income Tax
  taxFederal: number; // 12% Federal
  netPay: number;
  status: "approved" | "processed";
}

// TAX CONSTANTS FOR GEORGIA (GA, USA / Atlanta)
export const TAX_RATES = {
  FICA_SOCIAL_SECURITY: 0.062, // 6.20%
  FICA_MEDICARE: 0.0145,        // 1.45%
  GA_STATE_FLAT: 0.0539,       // 5.39% Flat GA tax for income calculation
  FEDERAL_WITHHOLDING: 0.12,   // 12.00% standard single worker bracket withholding
};

export function calculateDeductions(grossPay: number) {
  const ficaSS = Number((grossPay * TAX_RATES.FICA_SOCIAL_SECURITY).toFixed(2));
  const ficaMC = Number((grossPay * TAX_RATES.FICA_MEDICARE).toFixed(2));
  const gaState = Number((grossPay * TAX_RATES.GA_STATE_FLAT).toFixed(2));
  const federal = Number((grossPay * TAX_RATES.FEDERAL_WITHHOLDING).toFixed(2));
  const totalDeductions = Number((ficaSS + ficaMC + gaState + federal).toFixed(2));
  const netPay = Number((grossPay - totalDeductions).toFixed(2));

  return {
    ficaSS,
    ficaMC,
    gaState,
    federal,
    totalDeductions,
    netPay,
  };
}
