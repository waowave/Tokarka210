import { useState, useMemo } from 'react';
import { useStore } from './store';
import { generateGcode } from './utils/gcode';
import { ProfileEditor } from './components/ProfileEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { View2D } from './components/View2D';
import { View3D } from './components/View3D';
import { Download, Undo, Redo, FileDown, Layers, Box, Play, FileCode2, Globe, Save, FolderOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { t } from './lib/i18n';

export default function App() {
  const { undo, redo, past, future, loadPreset, updateState } = useStore();
  const state = useStore();
  const lang = state.language;
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'simulate' | 'gcode'>('2d');
  const [showSettings, setShowSettings] = useState(false);

  const { gcode } = useMemo(() => generateGcode(state), [state]);

  // Save project to JSON file
  const saveProject = () => {
    const projectName = state.projectName || 'project';
    const projectData = {
      version: '1.0',
      name: projectName,
      points: state.points,
      stock: state.stock,
      tool: state.tool,
      speeds: state.speeds,
      operations: state.operations,
      gcodeSettings: state.gcodeSettings,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save G-code to file
  const saveGcodeFile = () => {
    const projectName = state.projectName || 'part';
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.nc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load project from JSON file
  const loadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string);
        
        // Validate and load data
        if (projectData.projectName) updateState({ projectName: projectData.projectName });
        if (projectData.points) updateState({ points: projectData.points });
        if (projectData.stock) updateState({ stock: projectData.stock });
        if (projectData.tool) updateState({ tool: projectData.tool });
        if (projectData.speeds) updateState({ speeds: projectData.speeds });
        if (projectData.operations) updateState({ operations: projectData.operations });
        if (projectData.gcodeSettings) updateState({ gcodeSettings: projectData.gcodeSettings });
        
        alert(`Project "${projectData.name || projectData.projectName || 'Unknown'}" loaded successfully!`);
      } catch (err) {
        alert('Error loading project: Invalid file format');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const loadPawn = () => {
    loadPreset([
      { id: '1', z: 65, x: 5, r: 0 },
      { id: '2', z: 60, x: 5, r: 5 },
      { id: '3', z: 50, x: 15, r: 0 },
      { id: '4', z: 40, x: 15, r: 10 },
      { id: '5', z: 20, x: 8, r: 2 },
      { id: '6', z: 10, x: 20, r: 0 },
      { id: '7', z: 0, x: 20, r: 0 },
    ]);
  };

  const loadCone = () => {
    loadPreset([
      { id: '1', z: 17, x: 17.5, r: 0 },  // Ø17.5 at Z=17
      { id: '2', z: 0, x: 19.5, r: 0 },   // Ø19.5 at Z=0
    ]);
    // Also update stock length to match profile
    updateState({ stock: { ...useStore.getState().stock, length: 17 } });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-200 font-sans overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1 rounded">
              <Layers size={18} />
            </span>
            {t('app.title', lang)}
          </h1>
          
          <div className="h-6 w-px bg-slate-800 mx-2" />
          
          <button onClick={undo} disabled={past.length === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors" title={t('app.undo', lang)}>
            <Undo size={18} />
          </button>
          <button onClick={redo} disabled={future.length === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors" title={t('app.redo', lang)}>
            <Redo size={18} />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-2" />

          <div className="flex gap-2">
            <button onClick={loadPawn} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors">{t('app.presetPawn', lang)}</button>
            <button onClick={loadCone} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors">{t('app.presetCone', lang)}</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => updateState({ language: lang === 'ru' ? 'en' : 'ru' })} className="text-slate-400 hover:text-white p-2" title="Switch Language">
             <Globe size={18} />
          </button>
          
          {/* Project Save/Load */}
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3 mr-1">
            <button onClick={saveProject} className="text-slate-400 hover:text-white p-2" title="Save Project">
              <Save size={18} />
            </button>
            <label className="text-slate-400 hover:text-white p-2 cursor-pointer" title="Load Project">
              <FolderOpen size={18} />
              <input type="file" accept=".json" onChange={loadProject} className="hidden" />
            </label>
          </div>
          
          <button onClick={() => setShowSettings(!showSettings)} className={clsx("text-sm px-4 py-1.5 rounded font-medium transition-colors", showSettings ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300")}>
            {t('app.settings', lang)}
          </button>
          <button onClick={saveGcodeFile} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-1.5 rounded font-medium flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20">
            <Download size={16} /> {t('app.saveCode', lang)}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Points */}
        <ProfileEditor />

        {/* Center - Viewport */}
        <main className="flex-1 flex flex-col relative bg-slate-900">
          
          {/* Viewport Tabs */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-slate-800/80 p-1 rounded-lg backdrop-blur shadow-xl border border-slate-700/50">
            {[
              { id: '2d', icon: FileDown, label: t('app.tab2d', lang) },
              { id: '3d', icon: Box, label: t('app.tab3d', lang) },
              { id: 'simulate', icon: Play, label: t('app.tabSim', lang) },
              { id: 'gcode', icon: FileCode2, label: t('app.tabCode', lang) }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Viewport Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === '2d' && <View2D />}
            {activeTab === '3d' && <View3D mode="3d" />}
            {activeTab === 'simulate' && <View3D mode="simulate" />}
            {activeTab === 'gcode' && (
              <div className="w-full h-full p-6 pt-20 bg-slate-950 overflow-auto custom-scrollbar">
                <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap max-w-3xl mx-auto">
                  {gcode}
                </pre>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Settings */}
        {showSettings && (
          <aside key="settings-panel" className="w-[340px] min-w-[340px] shrink-0 border-l border-slate-800 bg-slate-800/50 shadow-2xl z-20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{t('settings.title', lang)}</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
               <SettingsPanel />
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}
