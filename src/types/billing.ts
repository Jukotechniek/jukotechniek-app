
import { WorkEntry } from './workHours';

export interface TechnicianBilling {
  technicianId: string;
  technicianName: string;
  hourlyRate: number;
  billableRate: number;
  overtimeMultiplier: number; // 1.25 for >8 hours
  weekendMultiplier: number; // 1.5 for weekends
}

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

export interface BillingPeriod {
  startDate: string;
  endDate: string;
  technicianBilling: TechnicianBilling[];
}

export interface CustomerBilling {
  customerId: string;
  customerName: string;
  totalHours: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  entries: WorkEntry[];
}
