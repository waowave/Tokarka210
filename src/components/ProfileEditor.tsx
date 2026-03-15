import { useStore } from '../store';
import { Plus, Trash2, ArrowUp, ArrowDown, Edit2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { t } from '../lib/i18n';
import { PointEditor } from './PointEditor';
import { useState, useEffect } from 'react';

export function ProfileEditor() {
  const { points, hoveredPointId, setHoveredPoint, addPoint, updatePoint, removePoint, updateState, language } = useStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ z: 0, x: 0, r: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const openEditor = (index: number) => {
    const p = points[index];
    setEditValues({ z: p.z, x: p.x, r: p.r || 0 });
    setEditingIndex(index);
  };

  const handleSaveEdit = (z: number, x: number, r: number) => {
    if (editingIndex !== null) {
      const p = points[editingIndex];
      updatePoint(p.id, { z, x, r });
      setEditingIndex(null);
    }
  };

  const handleAddPoint = (index: number) => {
    addPoint(index);
    // Open editor for the newly added point
    setTimeout(() => {
      const newIndex = index + 1;
      if (points[newIndex]) {
        openEditor(newIndex);
      }
    }, 50);
  };

  const movePoint = (index: number, direction: 1 | -1) => {
    if (index + direction < 0 || index + direction >= points.length) return;
    const newPoints = [...points];
    const temp = newPoints[index];
    newPoints[index] = newPoints[index + direction];
    newPoints[index + direction] = temp;
    updateState({ points: newPoints });
  };

  return (
    <div className="bg-slate-950 border-r border-slate-800 flex flex-col h-full overflow-hidden relative" style={{ width: isCollapsed ? 40 : 320, minWidth: isCollapsed ? 40 : 320 }}>
      {!isCollapsed && (
        <>
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 shadow-sm flex justify-between items-center pr-8">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t('profile.title', language)}</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2 py-1 rounded">{points.length} pts</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-800">
                  <th className="font-semibold p-2 w-8 text-center">#</th>
                  <th className="font-semibold p-2" title={t('profile.zLength', language)}>Z</th>
                  <th className="font-semibold p-2" title={`${t('profile.xRadius', language)} (Ø)`}>X (Ø)</th>
                  <th className="font-semibold p-2" title={t('profile.rFillet', language)}>R</th>
                  <th className="font-semibold p-2 text-right pr-1">{t('profile.actions', language)}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setHoveredPoint(p.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className={clsx(
                      "group transition-colors border-b border-slate-800/50 last:border-none",
                      hoveredPointId === p.id ? "bg-blue-900/40 ring-1 ring-inset ring-blue-500/50 rounded-md" : "hover:bg-slate-800/30"
                    )}
                  >
                    <td className="p-1 text-center text-xs font-mono text-slate-500 select-none">{i + 1}</td>
                    <td className="p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={p.z}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) updatePoint(p.id, { z: val });
                        }}
                        className="w-full min-w-[50px] text-sm bg-slate-900 border border-slate-700 focus:border-blue-500 focus:bg-slate-800 outline-none font-mono py-1.5 px-2 transition-all rounded-sm text-slate-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={p.x}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) updatePoint(p.id, { x: val });
                        }}
                        className="w-full min-w-[50px] text-sm bg-slate-900 border border-slate-700 focus:border-blue-500 focus:bg-slate-800 outline-none font-mono py-1.5 px-2 transition-all rounded-sm text-slate-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={p.r || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) updatePoint(p.id, { r: val });
                        }}
                        className="w-full min-w-[40px] text-sm bg-slate-900 border border-slate-700 focus:border-blue-500 focus:bg-slate-800 outline-none font-mono py-1.5 px-2 transition-all rounded-sm text-slate-200 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="p-1 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditor(i)} className="p-1 text-blue-400 hover:text-blue-300 rounded" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => movePoint(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 rounded">
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => movePoint(i, 1)} disabled={i === points.length - 1} className="p-1 text-slate-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 rounded">
                          <ArrowDown size={14} />
                        </button>
                        <button onClick={() => handleAddPoint(i)} className="p-1 text-slate-400 hover:text-green-400 rounded">
                          <Plus size={14} />
                        </button>
                        <button onClick={() => removePoint(p.id)} className="p-1 text-slate-400 hover:text-red-400 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-800 bg-slate-900 text-xs text-slate-400 text-center">
            {t('profile.profileTip', language)}
          </div>
        </>
      )}

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-3 right-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors z-20"
        title={isCollapsed ? 'Open Profile Editor' : 'Collapse Profile Editor'}
      >
        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* Point Editor Modal */}
      {editingIndex !== null && (
        <PointEditor
          z={editValues.z}
          x={editValues.x}
          r={editValues.r}
          index={editingIndex}
          isOpen={true}
          onSave={handleSaveEdit}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
}
