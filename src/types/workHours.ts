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
  /** Toegevoegd voor begin- en eindtijd: */
  startTime?: string; // Formaat: 'HH:mm'
  endTime?: string;   // Formaat: 'HH:mm'
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
  profit: number;
  revenue: number;
  costs: number;
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
