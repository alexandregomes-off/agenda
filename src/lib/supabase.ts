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
    id: String(dbRow.id),
    titulo: dbRow.titulo || dbRow.title || '',
    category: dbRow.category || dbRow.categoria || 'Work',
    completed: !!(dbRow.completed ?? dbRow.concluido ?? dbRow.concluida),
    due_date: dbRow.due_date || dbRow.dueDate || dbRow.data_vencimento || dbRow.vencimento || '',
    created_at: dbRow.created_at || dbRow.createdAt || dbRow.data_criacao || new Date().toISOString(),
    completed_at: dbRow.completed_at || dbRow.completedAt || dbRow.data_conclusao || undefined,
    deleted: !!(dbRow.deleted ?? dbRow.deletado ?? dbRow.excluido),
    deleted_at: dbRow.deleted_at || undefined,
    notes: dbRow.notes || dbRow.observacoes || dbRow.notas || '',
    status: dbRow.status || '',
    user_id: dbRow.user_id || undefined,
  };
}

/**
 * Maps Task model to Supabase database payload.
 * Only outputs developer-defined columns detected dynamically in the database schema.
 */
export function mapToDb(task: Task, userId?: string, isInsert = false): any {
  // Ensure we map standard and bilingual variations safely, mapping empty strings to null or omitting undefineds
  const valOrNull = (val: any) => {
    if (val === undefined) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  };

  const payload: any = {};

  // If knownColumns is populated, we map to those columns specifically.
  // Otherwise, we default strictly to the user's exact "tarefas" column list.
  const cols = knownColumns.length > 0 ? knownColumns : [
    'titulo', 'category', 'due_date', 'notes', 'completed', 'deleted', 'user_id', 'created_at', 'completed_at', 'status', 'deleted_at'
  ];

  if (!isInsert && isNumeric(task.id)) {
    payload.id = Number(task.id);
  }

  // Populate columns based on detected/known schemas
  if (cols.includes('titulo')) {
    payload.titulo = valOrNull(task.titulo);
  } else if (cols.includes('title')) {
    payload.title = valOrNull(task.titulo);
  }

  if (cols.includes('category')) {
    payload.category = valOrNull(task.category);
  } else if (cols.includes('categoria')) {
    payload.categoria = valOrNull(task.category);
  }

  if (cols.includes('completed')) {
    payload.completed = typeof task.completed === 'boolean' ? task.completed : false;
  } else if (cols.includes('concluido')) {
    payload.concluido = typeof task.completed === 'boolean' ? task.completed : false;
  } else if (cols.includes('concluida')) {
    payload.concluida = typeof task.completed === 'boolean' ? task.completed : false;
  }

  if (cols.includes('due_date')) {
    payload.due_date = valOrNull(task.due_date);
  } else if (cols.includes('dueDate')) {
    payload.dueDate = valOrNull(task.due_date);
  } else if (cols.includes('data_vencimento')) {
    payload.data_vencimento = valOrNull(task.due_date);
  } else if (cols.includes('vencimento')) {
    payload.vencimento = valOrNull(task.due_date);
  }

  if (cols.includes('notes')) {
    payload.notes = valOrNull(task.notes);
  } else if (cols.includes('observacoes')) {
    payload.observacoes = valOrNull(task.notes);
  } else if (cols.includes('notas')) {
    payload.notas = valOrNull(task.notes);
  }

  if (cols.includes('deleted')) {
    payload.deleted = typeof task.deleted === 'boolean' ? task.deleted : false;
  } else if (cols.includes('deletado')) {
    payload.deletado = typeof task.deleted === 'boolean' ? task.deleted : false;
  } else if (cols.includes('excluido')) {
    payload.excluido = typeof task.deleted === 'boolean' ? task.deleted : false;
  }

  if (cols.includes('created_at')) {
    payload.created_at = valOrNull(task.created_at);
  } else if (cols.includes('createdAt')) {
    payload.createdAt = valOrNull(task.created_at);
  } else if (cols.includes('data_criacao')) {
    payload.data_criacao = valOrNull(task.created_at);
  }

  if (cols.includes('completed_at')) {
    payload.completed_at = valOrNull(task.completed_at);
  } else if (cols.includes('completedAt')) {
    payload.completedAt = valOrNull(task.completed_at);
  } else if (cols.includes('data_conclusao')) {
    payload.data_conclusao = valOrNull(task.completed_at);
  }

  if (cols.includes('status')) {
    payload.status = valOrNull(task.status);
  }

  if (cols.includes('deleted_at')) {
    payload.deleted_at = valOrNull(task.deleted_at);
  }

  if (userId) {
    if (cols.includes('user_id')) {
      payload.user_id = userId;
    } else if (cols.includes('userId')) {
      payload.userId = userId;
    } else if (cols.includes('id_usuario')) {
      payload.id_usuario = userId;
    }
  }

  // Purely clean up undefined fields
  const cleanPayload: any = {};
  for (const key of Object.keys(payload)) {
    if (payload[key] !== undefined) {
      cleanPayload[key] = payload[key];
    }
  }

  return cleanPayload;
}

export function isNumeric(str: any): boolean {
  if (typeof str === 'number') return true;
  if (typeof str !== 'string') return false;
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

