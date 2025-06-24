export interface WorkSchedule {
  id: string;
  technicianId: string;
  technicianName: string;
  date: string;
  isWorking: boolean | null;
}
