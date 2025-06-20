
export interface Customer {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  isActive: boolean;
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
