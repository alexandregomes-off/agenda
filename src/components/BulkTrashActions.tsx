import { CheckSquare, Square, Trash } from 'lucide-react';

interface BulkTrashActionsProps {
  allDeletedCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

export default function BulkTrashActions({
  allDeletedCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
}: BulkTrashActionsProps) {
  if (allDeletedCount === 0) return null;

  const isAllSelected = selectedCount === allDeletedCount;

  return (
    <div className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-orange-50/40 border border-orange-100/30 mb-4 animate-[fadeUp_0.3s_ease]">
      <button
        type="button"
        onClick={isAllSelected ? onDeselectAll : onSelectAll}
        className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        {isAllSelected ? (
          <>
            <Square size={14} className="text-slate-500" />
            <span>Desmarcar todos</span>
          </>
        ) : (
          <>
            <CheckSquare size={14} className="text-pine" />
            <span>Selecionar todos</span>
          </>
        )}
      </button>

      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onDeleteSelected}
        className={`focus-ring flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
          selectedCount > 0
            ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer'
            : 'bg-rose-50 border border-rose-100/50 text-rose-300 opacity-60 cursor-not-allowed'
        }`}
      >
        <Trash size={14} />
        <span>Excluir selecionados {selectedCount > 0 && `(${selectedCount})`}</span>
      </button>
    </div>
  );
}
