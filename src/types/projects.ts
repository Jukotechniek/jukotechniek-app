
export interface Project {
  id: string;
  technicianId: string;
  technicianName: string;
  date: string;
  title: string;
  description: string;
  images: string[];
  hoursSpent: number;
  createdAt: string;
}

export interface ProjectImage {
  id: string;
  projectId: string;
  url: string;
  filename: string;
  uploadedAt: string;
}
