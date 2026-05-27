import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListTodo, BadgeCheck, Trash2, CalendarDays, LogOut } from 'lucide-react';
import { Task, TaskCategory } from './types';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import BulkTrashActions from './components/BulkTrashActions';
import AuthScreen from './components/AuthScreen';
import { supabase, mapFromDb, mapToDb, setKnownColumns, discoverColumns, isNumeric } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'active' | 'completed' | 'deleted'>('active');
  const [currentFilter, setCurrentFilter] = useState<'all' | TaskCategory>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('');
  const [isErrorStatus, setIsErrorStatus] = useState(false);

  // High quality default initial tasks which are used if the Cloud DB is empty
  const getInitialTasks = () => {
    const today = new Date();
    const getOffsetDateStr = (offsetDays: number) => {
      const d = new Date();
      d.setDate(today.getDate() + offsetDays);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return [
      {
        id: 'init-1',
        titulo: 'Formatar e enviar relatório de missões pendentes',
        category: 'Work' as TaskCategory,
        completed: false,
        due_date: getOffsetDateStr(0), // Today
        created_at: new Date().toISOString(),
        notes: 'Verificar os dados com o Sgt Santos antes de remeter',
        deleted: false,
      },
      {
        id: 'init-2',
        titulo: 'Realizar matrícula do curso presencial e pagar boleto',
        category: 'Personal' as TaskCategory,
        completed: false,
        due_date: getOffsetDateStr(-2), // 2 days ago (overdue)
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Pagamento via PIX ou boleto bancário principal',
        deleted: false,
      },
      {
        id: 'init-3',
        titulo: 'Comprar suprimentos de rancho e mantimentos',
        category: 'Shopping' as TaskCategory,
        completed: false,
        due_date: getOffsetDateStr(3), // 3 days left
        created_at: new Date().toISOString(),
        deleted: false,
      },
      {
        id: 'init-4',
        titulo: 'Enviar arquivo Cia consolidado anual',
        category: 'Work' as TaskCategory,
        completed: true,
        due_date: getOffsetDateStr(-1),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Já revisado pelo comandante de pelotão',
        deleted: false,
      },
    ];
  };

  // Manage Active Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch tasks only once logged in
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    async function fetchTasks() {
      try {
        setLoading(true);
        
        // Dynamically discover database columns first
        const cols = await discoverColumns();

        // Query the user's items
        const { data, error } = await supabase.from('tarefas').select('*');
        
        if (error) {
          console.error('Supabase query error, reverting to offline local scope:', error);
          showStatus('Usando modo local (banco offline).', true);
          
          const saved = localStorage.getItem(`agenda_tasks_${user.id}`);
          if (saved) {
            setTasks(JSON.parse(saved));
          } else {
            setTasks(getInitialTasks());
          }
        } else if (data) {
          // Dynamic inspection of columns to configure bilingual map settings if discovery was empty
          if (data.length > 0 && cols.length === 0) {
            setKnownColumns(Object.keys(data[0]));
          } else if (cols.length === 0) {
            setKnownColumns(['id', 'titulo', 'category', 'completed', 'due_date', 'created_at', 'completed_at', 'deleted', 'notes', 'user_id', 'created_id', 'status', 'deleted_at']);
          }

          // Segregate tasks for the logged-in user
          let userTasks = data;
          const sample = data.length > 0 ? data[0] : null;
          const hasUserIdColumn = cols.includes('user_id') || cols.includes('userId') || cols.includes('id_usuario') || 
            (sample && ('user_id' in sample || 'userId' in sample || 'id_usuario' in sample));

          if (hasUserIdColumn) {
            userTasks = data.filter((row: any) => 
              row.user_id === user.id || 
              row.userId === user.id || 
              row.id_usuario === user.id
            );
          }

          if (userTasks.length === 0) {
            // Seed defaults or migrate from local storage if existing
            const saved = localStorage.getItem(`agenda_tasks_${user.id}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.length > 0) {
                const mapped = parsed.map((t: Task) => mapToDb(t, user.id, true));
                const { data: insertedData, error: insertError } = await supabase.from('tarefas').insert(mapped).select();
                if (!insertError && insertedData) {
                  const savedTasks = insertedData.map(mapFromDb);
                  setTasks(savedTasks);
                  showStatus('Planos locais migrados para a Nuvem!');
                  return;
                }
              }
            }
            
            // Empty DB/User list - insert default list under current user ID
            const initial = getInitialTasks();
            const mapped = initial.map((t: Task) => mapToDb(t, user.id, true));
            const { data: insertedData } = await supabase.from('tarefas').insert(mapped).select();
            if (insertedData && insertedData.length > 0) {
              setTasks(insertedData.map(mapFromDb));
            } else {
              setTasks(initial);
            }
          } else {
            const parsed = userTasks.map(mapFromDb);
            setTasks(parsed);
          }
        }
      } catch (err) {
        console.error('Exception while Loading Supabase:', err);
        const saved = localStorage.getItem(`agenda_tasks_${user.id}`);
        if (saved) {
          setTasks(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchTasks();
  }, [user]);

  // Soft synchronisation to fallback state storage
  useEffect(() => {
    if (user && tasks.length > 0) {
      localStorage.setItem(`agenda_tasks_${user.id}`, JSON.stringify(tasks));
    }
  }, [tasks, user]);

  // Flash response status messages nicely to mimic real-time DB states
  const showStatus = (msg: string, isError = false) => {
    setStatusText(msg);
    setIsErrorStatus(isError);
    if (msg) {
      const timer = setTimeout(() => {
        setStatusText('');
      }, 3500);
      return () => clearTimeout(timer);
    }
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Format today's custom date elegantly in Portuguese
  const getHeaderDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    const formatted = today.toLocaleDateString('pt-BR', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const currentFormattedDate = getHeaderDate();

  // Create Task securely in Real time Cloud
  const handleAddTask = async (data: { title: string; category: TaskCategory; due_date: string; notes: string }) => {
    if (tasks.length >= 999) {
      showStatus('Limite de 999 planos atingido. Remova alguns para continuar.', true);
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      titulo: data.title,
      category: data.category,
      completed: false,
      due_date: data.due_date,
      created_at: new Date().toISOString(),
      notes: data.notes,
      deleted: false,
    };

    // Optimistic Local State Update
    setTasks((prev) => [newTask, ...prev]);
    showStatus('Sincronizando missão com a nuvem...');

    const dbPayload = mapToDb(newTask, user?.id, true);
    const { data: insertedData, error } = await supabase.from('tarefas').insert([dbPayload]).select();
    if (error) {
      console.error('Insert Supabase error:', error);
      showStatus('Sincronizado localmente (offline).', true);
    } else if (insertedData && insertedData.length > 0) {
      const savedTask = mapFromDb(insertedData[0]);
      setTasks((prev) =>
        prev.map((t) => (t.id === newTask.id ? savedTask : t))
      );
      showStatus('Missão adicionada à nuvem!');
    } else {
      showStatus('Missão adicionada à nuvem!');
    }
    setCurrentView('active');
  };

  // Toggle Complete / Re-open Task securely in cloud
  const handleToggleComplete = async (id: string) => {
    let targetTask: Task | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newCompleted = !t.completed;
          targetTask = {
            ...t,
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : undefined,
          };
          return targetTask;
        }
        return t;
      })
    );

    if (targetTask) {
      showStatus(targetTask.completed ? 'Plano concluído! Muito bem.' : 'Plano reaberto.');

      const dbId = isNumeric(id) ? Number(id) : id;
      const { error } = await supabase
        .from('tarefas')
        .update(mapToDb(targetTask, user?.id))
        .eq('id', dbId);

      if (error) {
        console.error('Supabase toggle error:', error);
        showStatus('Erro ao atualizar online.', true);
      }
    }
  };

  // Move to Trash (soft delete) in DB
  const handleMoveToTrash = async (id: string) => {
    let targetTask: Task | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          targetTask = { ...t, deleted: true };
          return targetTask;
        }
        return t;
      })
    );

    showStatus('Plano enviado para a lixeira.');

    if (targetTask) {
      const dbId = isNumeric(id) ? Number(id) : id;
      const { error } = await supabase
        .from('tarefas')
        .update(mapToDb(targetTask, user?.id))
        .eq('id', dbId);

      if (error) {
        console.error('Supabase soft delete error:', error);
        showStatus('Erro ao atualizar na nuvem.', true);
      }
    }
  };

  // Restore Task from Trash in DB
  const handleRestore = async (id: string) => {
    let targetTask: Task | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          targetTask = { ...t, deleted: false };
          return targetTask;
        }
        return t;
      })
    );

    setSelectedIds((prev) => prev.filter((i) => i !== id));
    showStatus('Plano restaurado.');

    if (targetTask) {
      const dbId = isNumeric(id) ? Number(id) : id;
      const { error } = await supabase
        .from('tarefas')
        .update(mapToDb(targetTask, user?.id))
        .eq('id', dbId);

      if (error) {
        console.error('Supabase restore error:', error);
        showStatus('Erro ao atualizar na nuvem.', true);
      }
    }
  };

  // Permanently Hard Delete Task from Cloud DB
  const handlePermanentDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    showStatus('Excluindo definitivamente...');

    const dbId = isNumeric(id) ? Number(id) : id;
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', dbId);

    if (error) {
      console.error('Supabase delete error:', error);
      showStatus('Erro ao remover da nuvem.', true);
    } else {
      showStatus('Plano excluído definitivamente do banco!');
    }
  };

  // Toggle selection for Bulk Deletes
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Trash Selection Callbacks
  const getDeletedTasks = () => tasks.filter((t) => t.deleted);
  const getVisibleDeletedTasks = () => {
    const deleted = getDeletedTasks();
    if (currentFilter === 'all') return deleted;
    return deleted.filter((t) => t.category === currentFilter);
  };

  const handleSelectAll = () => {
    const visibleDeleted = getVisibleDeletedTasks();
    setSelectedIds(visibleDeleted.map((t) => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const idsToDelete = [...selectedIds];

    setTasks((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));
    setSelectedIds([]);
    showStatus('Removendo lote do banco...');

    const dbIds = idsToDelete.map((id) => (isNumeric(id) ? Number(id) : id));
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .in('id', dbIds);

    if (error) {
      console.error('Supabase bulk delete error:', error);
      showStatus('Erro ao excluir lote online.', true);
    } else {
      showStatus(`${count} ${count === 1 ? 'plano excluído' : 'planos excluídos'} definitivamente.`);
    }
  };

  // Sorting Comparator based on original requirements
  // Completed, uncompleted, non-deleted, deleted
  const sortTasks = (a: Task, b: Task) => {
    if (a.deleted !== b.deleted) return a.deleted ? 1 : -1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    // Tasks without due_dates come last
    const aHasDate = !!(a.due_date && a.due_date.trim());
    const bHasDate = !!(b.due_date && b.due_date.trim());

    if (aHasDate && !bHasDate) return -1;
    if (!aHasDate && bHasDate) return 1;
    if (!aHasDate && !bHasDate) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    // Sort by due date (closest first)
    const dateDiff = new Date(a.due_date + 'T00:00:00').getTime() - new Date(b.due_date + 'T00:00:00').getTime();
    if (dateDiff !== 0) return dateDiff;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  // Filter Tasks list to display
  const getFilteredTasksToShow = () => {
    let list: Task[] = [];
    if (currentView === 'completed') {
      list = tasks.filter((t) => t.completed && !t.deleted);
    } else if (currentView === 'deleted') {
      list = tasks.filter((t) => t.deleted);
    } else {
      list = tasks.filter((t) => !t.completed && !t.deleted);
    }

    if (currentFilter !== 'all') {
      list = list.filter((t) => t.category === currentFilter);
    }

    return list.sort(sortTasks);
  };

  const filteredTasks = getFilteredTasksToShow();

  // Stats computations
  const totalActiveCount = tasks.filter((t) => !t.completed && !t.deleted).length;
  const totalCompletedCount = tasks.filter((t) => t.completed && !t.deleted).length;
  const totalDeletedCount = tasks.filter((t) => t.deleted).length;

  if (!authChecked) {
    return (
      <main className="soft-bg w-full min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-3"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Iniciando Central...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />;
  }

  return (
    <main className="soft-bg w-full min-h-screen px-4 py-8 flex items-center justify-center">
      <section className="glass-panel w-full max-w-[480px] rounded-[30px] p-5 sm:p-6 fade-in">
        {/* Header Elements */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1 col-span-1">
                <p className="text-slate-400 uppercase font-bold tracking-[0.18em] text-[10px]">
                  cia c/ ba ap log
                </p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Banco de dados Conectado" />
              </div>
              <h1 className="font-sans text-[26px] leading-tight text-slate-900 font-bold tracking-tight">
                Agenda Cb Alexandre
              </h1>
            </div>
            <div className="flex items-center gap-1.5 self-start shrink-0">
              <div className="rounded-full px-3.5 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 shrink-0 self-start shadow-sm whitespace-nowrap border border-slate-200">
                {currentFormattedDate}
              </div>
              <button
                onClick={handleLogOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                title="Sair do sistema"
                aria-label="Sair"
                id="logout-btn"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Task Form */}
        <TaskForm onAddTask={handleAddTask} />

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
          <button
            onClick={() => {
              setCurrentView('active');
              setSelectedIds([]);
            }}
            className={`focus-ring rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
              currentView === 'active'
                ? 'bg-pine text-white shadow-md shadow-pine/10 font-bold scale-[1.02]'
                : 'bg-white/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <ListTodo size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Ativos ({totalActiveCount})</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('completed');
              setSelectedIds([]);
            }}
            className={`focus-ring rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
              currentView === 'completed'
                ? 'bg-pine text-white shadow-md shadow-pine/10 font-bold scale-[1.02]'
                : 'bg-white/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <BadgeCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Concluídos ({totalCompletedCount})</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('deleted');
              setSelectedIds([]);
            }}
            className={`focus-ring rounded-xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer relative ${
              currentView === 'deleted'
                ? 'bg-pine text-white shadow-md shadow-pine/10 font-bold scale-[1.02]'
                : 'bg-white/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Lixeira ({totalDeletedCount})</span>
          </button>
        </div>

        {/* Category filters */}
        <nav className="mb-5 grid grid-cols-4 gap-1 sm:gap-1.5 select-none w-full">
          {(['all', 'Work', 'Personal', 'Shopping'] as const).map((cat) => {
            const label =
              cat === 'all'
                ? 'Todos'
                : cat === 'Work'
                ? 'Trabalho'
                : cat === 'Personal'
                ? 'Pessoal'
                : 'Compras';
            return (
              <button
                key={cat}
                onClick={() => setCurrentFilter(cat)}
                className={`focus-ring rounded-xl py-1.5 text-[10px] sm:text-xs font-bold transition-all duration-200 cursor-pointer text-center border truncate px-1 ${
                  currentFilter === cat
                    ? 'bg-pine text-white border-pine shadow-sm'
                    : 'bg-white/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Title and stats summary */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-bold text-base text-slate-900">
            {currentView === 'active'
              ? 'Missões Pendentes'
              : currentView === 'completed'
              ? 'Missões Concluídas'
              : 'Missões Descartadas'}
          </h2>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'plano' : 'planos'}
          </span>
        </div>

        {/* Bulk Trash Actions */}
        {currentView === 'deleted' && (
          <BulkTrashActions
            allDeletedCount={getVisibleDeletedTasks().length}
            selectedCount={selectedIds.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDeleteSelected={handleDeleteSelected}
          />
        )}

        {/* List of Task Cards with Animations */}
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-250">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentView={currentView}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={handleToggleSelect}
                onToggleComplete={handleToggleComplete}
                onMoveToTrash={handleMoveToTrash}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
              />
            ))}
          </AnimatePresence>

          {/* Empty States */}
          {filteredTasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3 text-slate-400">
                <CalendarDays size={20} />
              </div>
              <p className="font-bold text-slate-900 text-sm mb-1">
                {currentView === 'active'
                  ? 'Nenhum plano por aqui'
                  : currentView === 'completed'
                  ? 'Nenhuma missão concluída'
                  : 'Sua lixeira está vazia'}
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                {currentView === 'active'
                  ? 'Adicione sua primeira missão com uma data de vencimento importante.'
                  : currentView === 'completed'
                  ? 'Quando você concluir uma missão, ela aparecerá guardada nesta lista.'
                  : 'As missões excluídas vão aparecer aqui para recuperação ou descarte.'}
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer Real-time status bar */}
        <div className="min-h-[20px] mt-4 px-1 text-center">
          <AnimatePresence>
            {statusText && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-xs font-semibold ${isErrorStatus ? 'text-rose-600' : 'text-indigo-600'}`}
              >
                {statusText}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
