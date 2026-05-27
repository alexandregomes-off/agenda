export type TaskCategory = 'Work' | 'Personal' | 'Shopping';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  completed: boolean;
  due_date: string; // "YYYY-MM-DD" style, or "" for sem prazo
  created_at: string; // ISO string
  completed_at?: string; // ISO string for tracking when completed
  deleted: boolean; // sent to trash
  notes?: string; // extra notes or detail
}
