import { useState, useEffect } from "react";
import { 
  FileText, 
  MapPin, 
  Calendar, 
  User, 
  Check, 
  Printer, 
  CheckCircle, 
  TrendingUp, 
  Banknote,
  DollarSign
} from "lucide-react";
import { Paystub, Employee } from "../types";
import { approvePaystub, subscribePaystubs } from "../lib/dataService";

interface PaystubManagerProps {
  currentUser: Employee;
}

export default function PaystubManager({ currentUser }: PaystubManagerProps) {
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);

  const isAdmin = currentUser.role === "sup_admin";

  // Watch real-time paystub updates
  useEffect(() => {
    const unsub = subscribePaystubs((stubs) => {
      setPaystubs(stubs);
    });
    return () => unsub();
  }, []);

  // Filtered paystubs based on user role
  const viewablePaystubs = paystubs.filter((stub) => {
    return isAdmin ? true : stub.employeeId === currentUser.uid;
  });

  const handleProcessStub = async (stubId: string) => {
    try {
      await approvePaystub(stubId);
      // Update selected stub mapping too
      if (selectedPaystub && selectedPaystub.id === stubId) {
        setSelectedPaystub((prev) => prev ? { ...prev, status: "processed" } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Metrics summary
  const totalGrossDisbursed = viewablePaystubs.reduce((sum, item) => sum + item.grossPay, 0);
  const totalNetTakeHome = viewablePaystubs.reduce((sum, item) => sum + item.netPay, 0);
  const totalGeorgiaTaxesPaid = viewablePaystubs.reduce((sum, item) => sum + item.taxGAState, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3 animate-fadeIn">
        <div>
          <h2 className="font-sans font-extrabold text-base tracking-tight text-slate-800 m-0">
            Corporate Payroll & GA Withholding
          </h2>
          <p className="font-sans text-[11px] text-slate-400 m-0 mt-0.5">
            Completed on-site work orders dynamically process tax deduction ledgers matching current Atlanta, Georgia guidelines.
          </p>
        </div>
      </div>

      {/* Corporate Payroll Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {isAdmin ? "Gross Disbursed" : "Gross Salary Accumulated"}
            </span>
            <span className="font-mono text-xl font-extrabold text-slate-800">
              ${totalGrossDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-sm">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Net Take-Home (USD)
            </span>
            <span className="font-mono text-xl font-extrabold text-emerald-600">
              ${totalNetTakeHome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-sm">
            <Banknote className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              GA State Tax Paid (5.39%)
            </span>
            <span className="font-mono text-xl font-extrabold text-teal-600">
              ${totalGeorgiaTaxesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-sm">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Paystubs Registry Table */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h4 className="font-sans font-bold text-xs text-slate-700 m-0 uppercase tracking-wider">
              {isAdmin ? "All Staff Payslip Submissions" : "My Personal Paystubs"}
            </h4>
            <span className="font-mono text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/20">
              GA ATLANTA PAYROLL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 bg-slate-50/50 uppercase">
                  <th className="px-4 py-2">Paystub ID / Date</th>
                  <th className="px-4 py-2">Beneficiary Account</th>
                  <th className="px-4 py-2 text-right">Gross Pay</th>
                  <th className="px-4 py-2 text-right">Net Take-home</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {viewablePaystubs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-slate-400 italic font-sans">
                      No active payroll records. Complete an assigned hourly work ticket.
                    </td>
                  </tr>
                ) : (
                  viewablePaystubs.map((stub) => {
                    const isProcessed = stub.status === "processed";
                    const isSelected = selectedPaystub?.id === stub.id;

                    return (
                      <tr 
                        key={stub.id} 
                        onClick={() => setSelectedPaystub(stub)}
                        className={`hover:bg-slate-50 transition-all cursor-pointer ${
                          isSelected ? "bg-indigo-50/50 font-semibold border-l-2 border-indigo-600" : ""
                        }`}
                      >
                        <td className="px-4 py-2">
                          <p className="font-mono font-bold text-indigo-600 m-0">{stub.id.toUpperCase()}</p>
                          <p className="font-sans text-[9px] text-slate-400 m-0 mt-0.5">
                            {new Date(stub.payDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </td>

                        <td className="px-4 py-2">
                          <p className="font-sans text-slate-700 font-bold m-0">{stub.employeeName}</p>
                          <p className="font-mono text-[8px] text-slate-400 uppercase tracking-tight m-0">{stub.payType}</p>
                        </td>

                        <td className="px-4 py-2 text-right font-mono text-slate-600">
                          ${stub.grossPay.toFixed(2)}
                        </td>

                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">
                          ${stub.netPay.toFixed(2)}
                        </td>

                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block px-1.5 py-0.2 rounded-sm text-[8px] uppercase font-bold tracking-tight border ${
                            isProcessed 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                              : "bg-indigo-50 border-indigo-100 text-indigo-700 animate-pulse"
                          }`}>
                            {stub.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real Detailed Printed Visual Payslip Sheet */}
        <div className="lg:col-span-5">
          {selectedPaystub ? (
            <div className="bg-white border border-slate-300 rounded-xl shadow-lg p-6 space-y-6 printable-receipt animate-fadeIn relative">
              {/* Receipt Watermark header */}
              <div className="border-b border-dashed border-slate-300 pb-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h3 className="font-sans font-extrabold text-slate-900 tracking-tight text-lg m-0 uppercase">
                    Bora Holding Corp
                  </h3>
                </div>
                <p className="font-mono text-[9px] text-slate-400 tracking-wider uppercase mt-0.5 m-0 mb-3">
                  Atlanta GA, USA - Subsidiary Leta Technologies LLC
                </p>
                <span className="font-sans text-[10px] text-slate-500 block">
                  Official Statement of Compensation / Earnings Statement
                </span>
              </div>

              {/* Receipt Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-4 border-b border-dashed border-slate-200">
                <div>
                  <span className="block text-slate-400 font-semibold mb-0.5">EMPLOYEE ACCOUNT:</span>
                  <p className="font-bold text-slate-900 m-0">{selectedPaystub.employeeName}</p>
                  <p className="text-[10px] text-slate-500 font-mono m-0">ID: {selectedPaystub.employeeId}</p>
                </div>

                <div>
                  <span className="block text-slate-400 font-semibold mb-0.5">STATEMENT DETAILS:</span>
                  <p className="font-mono text-slate-900 m-0">STUB: {selectedPaystub.id.toUpperCase()}</p>
                  <p className="text-[10px] text-slate-500 m-0">
                    DATE: {new Date(selectedPaystub.payDate).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Description field */}
              <div className="text-xs bg-slate-50 rounded-lg p-3 border border-slate-100">
                <span className="block text-slate-400 font-bold mb-1">WORK TICKET REF:</span>
                <p className="font-bold text-slate-700 m-0 font-sans leading-tight">
                  ({selectedPaystub.jobId.toUpperCase()})
                </p>
                <p className="m-0 text-slate-500 tracking-tight mt-1 truncate">
                  {selectedPaystub.jobDescription}
                </p>
              </div>

              {/* Earnings Table */}
              <div className="space-y-2 text-xs">
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 font-sans">
                  Earnings Breakdown
                </span>

                <div className="flex items-center justify-between font-sans">
                  <span className="text-slate-600">
                    Agreement Rate {selectedPaystub.payType === "hourly" ? `(${selectedPaystub.payRate}/hr)` : "(Flat)"}
                  </span>
                  <span className="font-mono text-slate-900 font-semibold">
                    {selectedPaystub.payType === "hourly" 
                      ? `${selectedPaystub.loggedHours} Hours Work` 
                      : "Flat Contract Visit"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900 font-sans">
                  <span>Gross Earnings Amount</span>
                  <span className="font-mono text-indigo-700">${selectedPaystub.grossPay.toFixed(2)}</span>
                </div>
              </div>

              {/* TAX DEDUCTIONS - GEORGIA FLAT SYSTEM INTEGRATION */}
              <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="block text-[10px] font-extrabold text-rose-800 uppercase tracking-widest border-b border-rose-100 pb-1 font-sans">
                  GA Atlanta Taxation Withholdings
                </span>

                <div className="flex items-center justify-between font-sans text-slate-600">
                  <span>GA State Income Tax (5.39% Flat)</span>
                  <span className="font-mono text-rose-700 font-medium">-${selectedPaystub.taxGAState.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between font-sans text-slate-600">
                  <span>Federal Social Security Tax (FICA 6.20%)</span>
                  <span className="font-mono text-rose-700 font-medium">-${selectedPaystub.taxFicaSocialSecurity.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between font-sans text-slate-600">
                  <span>Federal Medicare Tax (FICA 1.45%)</span>
                  <span className="font-mono text-rose-700 font-medium">-${selectedPaystub.taxFicaMedicare.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between font-sans text-slate-600">
                  <span>Federal Standard Withholding (12.00%)</span>
                  <span className="font-mono text-rose-700 font-medium">-${selectedPaystub.taxFederal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between border-t border-rose-200 pt-1.5 font-extrabold text-rose-900 font-sans">
                  <span>Total Tax Deducted</span>
                  <span className="font-mono">
                    -${Number(
                      selectedPaystub.taxGAState + 
                      selectedPaystub.taxFicaSocialSecurity + 
                      selectedPaystub.taxFicaMedicare + 
                      selectedPaystub.taxFederal
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Take-Home pay summary */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-xl font-sans">
                <div>
                  <span className="font-sans text-[10px] font-bold text-emerald-800 tracking-wider block uppercase">
                    NET Salary Take-home pay
                  </span>
                  <span className="font-sans text-[10px] text-emerald-600 leading-none">
                    Transferred directly to bank account
                  </span>
                </div>
                <span className="font-mono text-xl font-black text-emerald-700 font-bold">
                  ${selectedPaystub.netPay.toFixed(2)}
                </span>
              </div>

              {/* Footer action */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                {isAdmin && selectedPaystub.status !== "processed" && (
                  <button
                    onClick={() => handleProcessStub(selectedPaystub.id)}
                    className="flex-grow flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Disbursements</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl leading-relaxed">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-sans text-slate-500 font-medium m-0">No payslip selected for review.</p>
              <p className="font-sans text-xs text-slate-400 mt-1">Select an active paycheck on the table list to see line item Georgia withholdings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
