import { createClient } from '@supabase/supabase-js';
import { Task } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://llssoimcngkqpprnmsig.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DJFPSAxWVeC-uz2V_T0Fzg_Cu9NU1Ol';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Keeps track of the exact columns present in the user's "tarefas" table dynamically
let knownColumns: string[] = [];

export function setKnownColumns(columns: string[]) {
  knownColumns = columns;
}

/**
 * Dynamically queries the Supabase OpenAPI metadata endpoint to find the exact column names of the table 'tarefas'.
 * This runs on app startup or session change to ensure insertions only refer to actually existing columns.
 */
export async function discoverColumns(): Promise<string[]> {
  try {
    const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`;
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
      }
    });
    if (res.ok) {
      const dbSchema = await res.json();
      const tarefasProperties = dbSchema?.definitions?.tarefas?.properties;
      if (tarefasProperties) {
        const columns = Object.keys(tarefasProperties);
        knownColumns = columns;
        console.log('Dynamic schema discovery succeeded. Columns of "tarefas":', columns);
        return columns;
      }
    }
  } catch (err) {
    console.error('Failed to discover database columns dynamically via OpenAPI:', err);
  }
  return [];
}

/**
 * Maps Supabase columns to client-side Task model format.
 * Dynamically resolves English/Portuguese naming and snake_case/camelCase.
 */
export function mapFromDb(dbRow: any): Task {
  return {
    id: dbRow.id,
    title: dbRow.title || dbRow.titulo || '',
    category: dbRow.category || dbRow.categoria || 'Work',
    completed: !!(dbRow.completed ?? dbRow.concluido ?? dbRow.concluida),
    due_date: dbRow.due_date || dbRow.dueDate || dbRow.data_vencimento || dbRow.vencimento || '',
    created_at: dbRow.created_at || dbRow.createdAt || dbRow.data_criacao || new Date().toISOString(),
    completed_at: dbRow.completed_at || dbRow.completedAt || dbRow.data_conclusao || undefined,
    deleted: !!(dbRow.deleted ?? dbRow.deletado ?? dbRow.excluido),
    notes: dbRow.notes || dbRow.observacoes || dbRow.notas || '',
  };
}

/**
 * Maps Task model to Supabase database payload.
 * Only outputs developer-defined columns detected dynamically in the database schema.
 */
export function mapToDb(task: Task, userId?: string): any {
  // Ensure we map standard and bilingual variations safely, mapping empty strings to null or omitting undefineds
  const valOrNull = (val: any) => {
    if (val === undefined) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  };

  const fieldMappings: { [key: string]: any } = {
    id: task.id,
    title: valOrNull(task.title),
    titulo: valOrNull(task.title),
    category: valOrNull(task.category),
    categoria: valOrNull(task.category),
    completed: typeof task.completed === 'boolean' ? task.completed : false,
    concluido: typeof task.completed === 'boolean' ? task.completed : false,
    concluida: typeof task.completed === 'boolean' ? task.completed : false,
    due_date: valOrNull(task.due_date),
    dueDate: valOrNull(task.due_date),
    data_vencimento: valOrNull(task.due_date),
    vencimento: valOrNull(task.due_date),
    created_at: valOrNull(task.created_at),
    createdAt: valOrNull(task.created_at),
    data_criacao: valOrNull(task.created_at),
    completed_at: valOrNull(task.completed_at),
    completedAt: valOrNull(task.completed_at),
    data_conclusao: valOrNull(task.completed_at),
    deleted: typeof task.deleted === 'boolean' ? task.deleted : false,
    deletado: typeof task.deleted === 'boolean' ? task.deleted : false,
    excluido: typeof task.deleted === 'boolean' ? task.deleted : false,
    notes: valOrNull(task.notes),
    observacoes: valOrNull(task.notes),
    notas: valOrNull(task.notes),
  };

  const payload: any = {};

  if (knownColumns.length > 0) {
    for (const col of knownColumns) {
      if (col in fieldMappings) {
        payload[col] = fieldMappings[col];
      }
    }
  } else {
    // Safe default to standard snake_case
    payload.id = task.id;
    payload.title = valOrNull(task.title);
    payload.category = valOrNull(task.category);
    payload.completed = typeof task.completed === 'boolean' ? task.completed : false;
    payload.due_date = valOrNull(task.due_date);
    payload.created_at = valOrNull(task.created_at);
    payload.completed_at = valOrNull(task.completed_at);
    payload.deleted = typeof task.deleted === 'boolean' ? task.deleted : false;
    payload.notes = valOrNull(task.notes);
  }

  // Inject user_id relations on verified schema
  if (userId) {
    if (knownColumns.length > 0) {
      if (knownColumns.includes('user_id')) {
        payload.user_id = userId;
      } else if (knownColumns.includes('userId')) {
        payload.userId = userId;
      } else if (knownColumns.includes('id_usuario')) {
        payload.id_usuario = userId;
      }
    } else {
      payload.user_id = userId;
    }
  }

  // Dynamically purge any undefined properties to guarantee standard REST payload safety
  const cleanPayload: any = {};
  for (const key of Object.keys(payload)) {
    if (payload[key] !== undefined) {
      cleanPayload[key] = payload[key];
    }
  }

  return cleanPayload;
}

