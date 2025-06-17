
export interface WorkEntry {
  id: string;
  technicianId: string;
  technicianName: string;
  date: string;
  hoursWorked: number;
  isManualEntry: boolean;
  description?: string;
  travelExpense?: number;
  createdAt: string;
  createdBy: string;
}

export interface TechnicianSummary {
  technicianId: string;
  technicianName: string;
  totalHours: number;
  daysWorked: number;
  lastWorked: string;
}
