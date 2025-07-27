export interface ChatHistory {
  id: number;
  session_id: string;
  message: any; // You can type this more strictly if you know the structure
  created_at?: string | null;
}
