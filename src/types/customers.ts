
export interface Customer {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CustomerTechnicianRate {
  id: string;
  customerId: string;
  technicianId: string;
  travelExpenseToTechnician: number; // Money paid to technician for travel
  travelExpenseFromClient: number; // Money received from client for travel
  createdAt: string;
  updatedAt: string;
}
