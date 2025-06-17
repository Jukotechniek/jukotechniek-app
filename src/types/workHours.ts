
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
  travelExpense?: number;
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  isWeekend: boolean;
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
  daysWorked: number;
  lastWorked: string;
}

export interface OvertimeCalculation {
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  regularPay: number;
  overtimePay: number;
  weekendPay: number;
  totalPay: number;
}
