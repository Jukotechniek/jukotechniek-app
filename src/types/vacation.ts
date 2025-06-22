
export interface VacationRequest {
  id: string;
  technicianId: string;
  technicianName: string;
  startDate: string;
  endDate: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}
