export type TaskCategory = 'Work' | 'Personal' | 'Shopping';

export interface Task {
  id: string;
  titulo: string;
  category: TaskCategory;
  completed: boolean;
  due_date: string; // "YYYY-MM-DD" style, or "" for sem prazo
  created_id?: string;
  created_at?: string; // ISO string
  completed_at?: string; // ISO string for tracking when completed
  deleted: boolean; // sent to trash
  deleted_at?: string;
  notes?: string; // extra notes or detail
  status?: string;
  user_id?: string;
}
