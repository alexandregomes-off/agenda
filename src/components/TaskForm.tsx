import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskCategory } from '../types';

interface TaskFormProps {
  onAddTask: (data: {
    title: string;
    category: TaskCategory;
    due_date: string;
    notes: string;
  }) => void;
}

export default function TaskForm({ onAddTask }: TaskFormProps) {
  const getTodayISOString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayISOString();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Work');
  const [dueDate, setDueDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [noDeadline, setNoDeadline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    // Mimic the addition timing for realistic and pleasing visual experience
    setTimeout(() => {
      onAddTask({
        title: title.trim(),
        category,
        due_date: noDeadline ? '' : dueDate,
        notes: notes.trim(),
      });
      setTitle('');
      setNotes('');
      setNoDeadline(false);
      setDueDate(todayStr);
      setIsSubmitting(false);
    }, 400);
  };

  const handleNoDeadlineChange = (checked: boolean) => {
    setNoDeadline(checked);
    if (checked) {
      setDueDate('');
    } else {
      setDueDate(todayStr);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div>
        <label
          htmlFor="taskTitle"
          className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5 text-slate-500"
        >
          Missão *
        </label>
        <textarea
          id="taskTitle"
          required
          rows={2}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Pagar matrícula, comprar mantimentos, reunião..."
          className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[14px] text-slate-900 outline-none placeholder:text-slate-400/80 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="categorySelect"
            className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5 text-slate-500"
          >
            Categoria
          </label>
          <select
            id="categorySelect"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          >
            <option value="Work">Trabalho</option>
            <option value="Personal">Pessoal</option>
            <option value="Shopping">Compras</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="dueDateInput"
            className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5 text-slate-500"
          >
            Vencimento
          </label>
          <input
            id="dueDateInput"
            type="date"
            disabled={noDeadline}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`focus-ring w-full rounded-xl border bg-white px-3 py-2 text-[14px] text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${
              noDeadline ? 'opacity-40 border-slate-200 bg-slate-100 cursor-not-allowed' : 'border-slate-200'
            }`}
          />
          
          {/* Checkbox cleanly placed below Vencimento */}
          <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
            <input
              type="checkbox"
              checked={noDeadline}
              onChange={(e) => handleNoDeadlineChange(e.target.checked)}
              className="focus-ring w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer"
            />
            <span className="text-[11px] font-bold text-slate-550 uppercase tracking-widest leading-none">
              Sem Prazo de Vencimento
            </span>
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="notesInput"
          className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5 text-slate-500"
        >
          Observações (opcional)
        </label>
        <textarea
          id="notesInput"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione notas ou observações contextuais para esta missão..."
          className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[14px] text-slate-900 outline-none placeholder:text-slate-400/80 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="focus-ring w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm hover:translate-y-[-1px] disabled:translate-y-0 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Adicionando...</span>
            </>
          ) : (
            <>
              <Plus size={16} strokeWidth={2.5} />
              <span>Adicionar missão</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
