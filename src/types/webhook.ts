
export interface WebhookData {
  id: string;
  technicianId: string;
  date: string;
  hoursWorked: number;
  receivedAt: string;
  verified: boolean;
}

export interface HourComparison {
  technicianId: string;
  technicianName: string;
  date: string;
  manualHours: number;
  webhookHours: number;
  difference: number;
  manualIds?: string[];
  webhookIds?: string[];
  verified?: boolean;
  status: 'match' | 'discrepancy' | 'missing_webhook' | 'missing_manual';
}
