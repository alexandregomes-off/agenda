import React from 'react';
import { motion } from 'motion/react';
import { Check, Trash2, RotateCcw, Trash, Calendar, FileText } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  currentView: 'active' | 'completed' | 'deleted';
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export default function TaskCard({
  task,
  currentView,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
}: TaskCardProps): React.JSX.Element {
  
  // Custom Date Difference Calculator matching the exact original applet's logic nicely
  const getDayDifference = (dateString: string): number | null => {
    if (!dateString || !dateString.trim()) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const due = new Date(year, month - 1, day);
    const now = new Date();
    // Zero out hours to calculate exact day differences
    const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = due.getTime() - current.getTime();
    return Math.round(diffMs / 86400000);
  };

  const getStatusBadge = () => {
    if (task.deleted) {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-deleted">
          NA LIXEIRA
        </span>
      );
    }

    if (task.completed) {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-done">
          CONCLUÍDA
        </span>
      );
    }

    if (!task.due_date || !task.due_date.trim()) {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-future">
          SEM PRAZO
        </span>
      );
    }

    const diff = getDayDifference(task.due_date);
    if (diff === null) {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-future">
          SEM PRAZO
        </span>
      );
    }

    if (diff === 0) {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-today animate-pulse">
          VENCE HOJE
        </span>
      );
    } else if (diff > 0) {
      const label = diff === 1 ? 'FALTA 1 DIA' : `FALTAM ${diff} DIAS`;
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-future">
          {label}
        </span>
      );
    } else {
      const overdue = Math.abs(diff);
      const label = overdue === 1 ? '1 DIA ATRASADA' : `${overdue} DIAS ATRASADA`;
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide status-overdue">
          {label}
        </span>
      );
    }
  };

  const formatDisplayDate = (value: string) => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length < 3) return value;
    const [, month, day] = parts;
    return `${day}/${month}`;
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-2xl border px-4 py-3.5 flex items-start gap-3 transition-colors duration-200 ${
        task.deleted
          ? 'bg-rose-50/40 border-rose-100/50 opacity-80'
          : task.completed
          ? 'bg-slate-50 border-slate-200/60'
          : 'bg-white border-slate-200 hover:border-indigo-200'
      }`}
    >
      {/* Selection Checkbox for Trash View */}
      {currentView === 'deleted' && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          className="w-5 h-5 rounded border-gray-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500/20 mt-1 shrink-0 cursor-pointer"
          aria-label="Selecionar para exclusão"
        />
      )}

      {/* Completion toggle button for non-trash views */}
      {currentView !== 'deleted' && (
        <button
          onClick={() => onToggleComplete(task.id)}
          className={`focus-ring w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5 cursor-pointer ${
            task.completed
              ? 'bg-pine border-pine text-white'
              : 'border-slate-300 hover:border-indigo-600 text-transparent hover:text-indigo-600 hover:bg-indigo-50'
          }`}
          aria-label="Alternar tarefa"
        >
          <Check size={14} strokeWidth={3} className={task.completed ? 'block' : 'opacity-0 hover:opacity-100'} />
        </button>
      )}

      {/* Core task description and dates container */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-medium leading-snug break-words ${
            task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}
        >
          {task.title}
        </p>

        {/* Notes details */}
        {task.notes && task.notes.trim() && (
          <div className="mt-1.5 flex items-start gap-1.5 text-slate-400 text-xs italic break-words leading-relaxed pl-1 border-l-2 border-slate-200">
            <FileText size={12} className="shrink-0 mt-0.5 text-slate-400" />
            <span>{task.notes}</span>
          </div>
        )}

        {/* Tags / Badges container */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {/* Category Tag */}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              task.category === 'Work'
                ? 'category-work'
                : task.category === 'Personal'
                ? 'category-personal'
                : 'category-shopping'
            }`}
          >
            {task.category === 'Work'
              ? 'Trabalho'
              : task.category === 'Personal'
              ? 'Pessoal'
              : 'Compras'}
          </span>

          {/* Target Due Date */}
          {task.due_date && task.due_date.trim() && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50/50 text-indigo-700 border border-indigo-100/55">
              <Calendar size={10} />
              {formatDisplayDate(task.due_date)}
            </span>
          )}

          {/* Completed Timestamp */}
          {task.completed && task.completed_at && (
            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              ✓ {formatDisplayDate(task.completed_at.split('T')[0])}
            </span>
          )}

          {/* Dynamic computed status indicator */}
          {getStatusBadge()}
        </div>
      </div>

      {/* Actions (trash/restore/permanent delete) */}
      <div className="flex items-center gap-0.5 shrink-0 self-start">
        {currentView === 'deleted' ? (
          <>
            {/* Restore button */}
            <button
              onClick={() => onRestore(task.id)}
              className="focus-ring p-1.5 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              title="Restaurar tarefa"
              aria-label="Restaurar tarefa"
            >
              <RotateCcw size={16} />
            </button>
            {/* Permanent Delete button */}
            <button
              onClick={() => onPermanentDelete(task.id)}
              className="focus-ring p-1.5 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Excluir permanentemente"
              aria-label="Excluir permanentemente"
            >
              <Trash size={16} />
            </button>
          </>
        ) : (
          /* Move to Trash button */
          <button
            onClick={() => onMoveToTrash(task.id)}
            className="focus-ring p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-40 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
            title="Mover para a lixeira"
            aria-label="Excluir tarefa"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </motion.article>
  );
}
