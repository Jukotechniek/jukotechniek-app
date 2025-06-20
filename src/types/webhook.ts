
export interface HourComparison {
  technicianId: string;
  technicianName: string;
  date: string;
  manualHours: number;
  webhookHours: number;
  manualIds: string[];
  webhookIds: string[];
  verified: boolean;
  difference: number;
  status: 'match' | 'discrepancy' | 'missing_manual' | 'missing_webhook';
}
