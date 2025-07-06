export interface HourComparison {
  technicianId: string;
  technicianName: string;
  date: string;
  manualHours: number;
  webhookHours: number;
  manualIds: string[];
  webhookIds: string[];
  manualStartTimes: string[];   // nieuw: lijst van begintijden uit work_hours
  manualEndTimes: string[];     // nieuw: lijst van eindtijden uit work_hours
  webhookStartTimes: string[];  // nieuw: lijst van begintijden uit webhook_hours
  webhookEndTimes: string[];    // nieuw: lijst van eindtijden uit webhook_hours
  verified: boolean;
  difference: number;
  status: 'match' | 'discrepancy' | 'missing_manual' | 'missing_webhook';
}
