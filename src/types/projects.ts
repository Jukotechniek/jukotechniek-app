
export interface Project {
  id: string;
  technicianId: string;
  technicianName: string;
  customerId?: string;
  customerName?: string;
  date: string;
  title: string;
  description: string;
  images: string[];
  hoursSpent: number;
  status: 'in-progress' | 'completed' | 'needs-review';
  createdAt: string;
  updatedAt?: string;
  isPublic?: boolean;
  createdBy?: string | null;
  createdByName?: string | null;
}

export interface ProjectImage {
  id: string;
  projectId: string;
  url: string;
  filename: string;
  uploadedAt: string;
}
