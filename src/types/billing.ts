
export interface TechnicianRate {
  technicianId: string;
  technicianName: string;
  hourlyRate: number;
  billableRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillingReport {
  technicianId: string;
  technicianName: string;
  totalHours: number;
  hourlyRate: number;
  billableRate: number;
  totalCost: number;
  totalBillable: number;
  profit: number;
}
