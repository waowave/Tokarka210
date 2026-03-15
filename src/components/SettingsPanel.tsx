import { useStore } from '../store';
import { LatheState } from '../types';
import { Settings, Settings2, Wrench, Code, HelpCircle } from 'lucide-react';
import { t } from '../lib/i18n';

export function SettingsPanel() {
  const { stock, tool, speeds, operations, gcodeSettings, updateState, language, projectName } = useStore();

  const handleUpdate = (key: keyof LatheState, subKey: string, value: any) => {
    if (key === 'projectName') {
      // projectName is a direct string value, not an object
      updateState({ [key]: value } as any);
      return;
    }
    const currentState = useStore.getState();
    const updatedSection = { ...(currentState[key] as any), [subKey]: value };
    updateState({ [key]: updatedSection } as any);
  };

  return (
    <div className="bg-slate-800 text-slate-200 p-4 rounded-lg flex flex-col gap-6 overflow-y-auto max-h-full custom-scrollbar">

      {/* Project Name */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase">
          <Code size={16} /> Project
        </h3>
        <label className="text-xs flex flex-col gap-1">
          Project Name (used for file names)
          <input
            type="text"
            value={projectName}
            onChange={(e) => handleUpdate('projectName', '', e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded p-1.5 outline-none focus:border-blue-500 transition-colors text-white"
            placeholder="my-part"
          />
        </label>
        <p className="text-xs text-slate-500 mt-1">Files will be saved as: {projectName || 'project'}.json / .nc</p>
      </section>

      {/* Stock Settings */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase">
          <Settings size={16} /> {t('settings.stockGeometry', language)}
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs flex flex-col gap-1">
            {t('settings.diameter', language)}
            <input type="number" step="any" value={stock.diameter} onChange={(e) => handleUpdate('stock', 'diameter', parseFloat(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1.5 outline-none focus:border-blue-500 transition-colors" />
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-1">Length is auto-calculated from profile max Z</p>
      </section>

      {/* Tool Settings */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase">
          <Wrench size={16} /> {t('settings.cuttingTool', language)}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs flex flex-col gap-1">
            {t('settings.noseRadius', language)}
            <input type="number" step="any" value={tool.radius} onChange={(e) => handleUpdate('tool', 'radius', parseFloat(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1.5 outline-none focus:border-blue-500" />
          </label>
          <label className="text-xs flex flex-col gap-1">
            {t('settings.roughingAllowance', language)}
            <input type="number" step="any" value={tool.roughingAllowance} onChange={(e) => handleUpdate('tool', 'roughingAllowance', parseFloat(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1.5 outline-none focus:border-blue-500" />
          </label>
        </div>
      </section>

      {/* Operations & Speeds */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase">
          <Settings2 size={16} /> {t('settings.opsAndFeeds', language)}
        </h3>
        
        <div className="space-y-2 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-white">
            <input type="checkbox" checked={operations.facing} onChange={(e) => handleUpdate('operations', 'facing', e.target.checked)} className="accent-blue-500 rounded" />
            {t('settings.facing', language)}
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-white flex-1">
              <input type="checkbox" checked={operations.roughing} onChange={(e) => handleUpdate('operations', 'roughing', e.target.checked)} className="accent-blue-500 rounded" />
              {t('settings.roughingPasses', language)}
            </label>
            <div className="relative group flex items-center" title={t('settings.depthOfCutTooltip', language)}>
               <input type="number" step="any" value={operations.roughingDepthOfCut} onChange={(e) => handleUpdate('operations', 'roughingDepthOfCut', parseFloat(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 w-16 text-xs outline-none focus:border-blue-500 pr-5" />
               <HelpCircle size={12} className="absolute right-1 text-slate-500 cursor-help" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-white">
            <input type="checkbox" checked={operations.finishing} onChange={(e) => handleUpdate('operations', 'finishing', e.target.checked)} className="accent-blue-500 rounded" />
            {t('settings.finishingPass', language)}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-white">
            <input type="checkbox" checked={operations.parting} onChange={(e) => handleUpdate('operations', 'parting', e.target.checked)} className="accent-blue-500 rounded" />
            {t('settings.partingOff', language)}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="text-xs flex flex-col gap-1 relative">
            <div className="flex items-center gap-1" title={t('settings.feedTooltip', language)}>
              {t('settings.roughingFeed', language)}
              <HelpCircle size={12} className="text-slate-500 cursor-help" />
            </div>
            <input type="number" step="any" value={speeds.roughingFeed} onChange={(e) => handleUpdate('speeds', 'roughingFeed', parseFloat(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1.5 outline-none focus:border-blue-500" />
          </label>
          <label className="text-xs flex flex-col gap-1">
            {t('settings.spindleSpeed', language)}
            <input type="number" step="any" value={speeds.spindleSpeed} onChange={(e) => handleUpdate('speeds', 'spindleSpeed', parseFloat(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1.5 outline-none focus:border-blue-500" />
          </label>
        </div>
      </section>

      {/* G-Code Setup */}
      <section className="flex-1 min-h-[150px] flex flex-col">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase">
          <Code size={16} /> {t('settings.postProcessor', language)}
        </h3>
        <div className="space-y-3 flex-1 flex flex-col">
          <label className="text-xs flex flex-col gap-1 flex-1">
            {t('settings.headerLines', language)}
            <textarea value={gcodeSettings.header} onChange={(e) => handleUpdate('gcodeSettings', 'header', e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 outline-none focus:border-blue-500 flex-1 resize-none text-[10px] font-mono whitespace-pre" />
          </label>
          <label className="text-xs flex flex-col gap-1 flex-1">
            {t('settings.footerLines', language)}
            <textarea value={gcodeSettings.footer} onChange={(e) => handleUpdate('gcodeSettings', 'footer', e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 outline-none focus:border-blue-500 flex-1 resize-none text-[10px] font-mono whitespace-pre" />
          </label>
        </div>
      </section>

    </div>
  );
}
