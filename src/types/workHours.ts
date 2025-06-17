
export interface WorkEntry {
  id: string;
  technicianId: string;
  technicianName: string;
  customerId: string;
  customerName: string;
  date: string;
  hoursWorked: number;
  isManualEntry: boolean;
  description?: string;
  travelExpenseToTechnician?: number;
  travelExpenseFromClient?: number;
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  sundayHours: number;
  isWeekend: boolean;
  isSunday: boolean;
  createdAt: string;
  createdBy: string;
}

export interface TechnicianSummary {
  technicianId: string;
  technicianName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  sundayHours: number;
  daysWorked: number;
  lastWorked: string;
}

export interface OvertimeCalculation {
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  sundayHours: number;
  regularPay: number;
  overtimePay: number;
  weekendPay: number;
  sundayPay: number;
  totalPay: number;
}
