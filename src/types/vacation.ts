export interface VacationRequest {
  id: string;
  technicianId: string;
  technicianName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'denied';
  approvedBy?: string | null;
}
