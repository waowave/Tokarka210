import { useState, useEffect, useRef } from 'react';
import { X, Check, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';

export interface PointEditorProps {
  z: number;
  x: number;
  r: number;
  isOpen: boolean;
  onSave: (z: number, x: number, r: number) => void;
  onClose: () => void;
  index: number;
}

export function PointEditor({ z, x, r, isOpen, onSave, onClose, index }: PointEditorProps) {
  const [editZ, setEditZ] = useState(z);
  const [editX, setEditX] = useState(x);
  const [editR, setEditR] = useState(r);
  const [activeField, setActiveField] = useState<'z' | 'x' | 'r'>('z');
  const [decimalMode, setDecimalMode] = useState(false); // false = whole, true = decimals
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditZ(z);
      setEditX(x);
      setEditR(r);
      setActiveField('z');
      setDecimalMode(false);
    }
  }, [isOpen, z, x, r]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen, activeField]);

  // Get the current value for active field
  const getActiveValue = () => {
    if (activeField === 'z') return editZ;
    if (activeField === 'x') return editX;
    return editR;
  };

  // Format value for display - show 1 or 2 decimal places intelligently
  const formatValue = (value: number) => {
    // Round to 2 decimal places to avoid floating point issues
    const rounded = Math.round(value * 100) / 100;
    const str = rounded.toString();
    const parts = str.split('.');
    const whole = parts[0];
    let decimal = parts[1] || '0';
    
    // Pad to at least 1 digit
    if (decimal.length === 0) decimal = '0';
    
    // If we have 2 digits and second is 0, show only 1 (e.g., 5.60 → 5.6)
    if (decimal.length === 2 && decimal[1] === '0') {
      decimal = decimal[0]; // Show 5.6 not 5.60
    }
    
    return { whole, decimal, isTwoDigits: decimal.length === 2 && decimal[1] !== '0' };
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape - close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter - save
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave(editZ, editX, editR);
        return;
      }

      // Number keys (including numpad)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleNumpad(e.key);
        return;
      }

      // Period, comma, or Tab - toggle decimal mode
      if (e.key === '.' || e.key === ',' || e.key === 'Tab') {
        e.preventDefault();
        setDecimalMode(prev => !prev);
        return;
      }

      // Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      // Arrow keys to switch fields
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeField === 'x') setActiveField('z');
        else if (activeField === 'r') setActiveField('x');
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeField === 'z') setActiveField('x');
        else if (activeField === 'x') setActiveField('r');
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeField, editZ, editX, editR, decimalMode]);

  if (!isOpen) return null;

  const handleWheel = (e: React.WheelEvent, field: 'z' | 'x' | 'r') => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    if (field === 'z') setEditZ(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
    if (field === 'x') setEditX(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
    if (field === 'r') setEditR(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const handleGlobalWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Add or subtract exactly 0.1 without rounding
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    if (activeField === 'z') setEditZ(prev => {
      const newVal = prev + delta;
      return Math.round(newVal * 100) / 100; // Round to 2 decimals only
    });
    if (activeField === 'x') setEditX(prev => {
      const newVal = prev + delta;
      return Math.round(newVal * 100) / 100;
    });
    if (activeField === 'r') setEditR(prev => {
      const newVal = prev + delta;
      return Math.round(newVal * 100) / 100;
    });
  };

  const adjustValue = (field: 'z' | 'x' | 'r', delta: number) => {
    if (field === 'z') setEditZ(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
    if (field === 'x') setEditX(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
    if (field === 'r') setEditR(prev => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const handleNumpad = (value: string) => {
    const currentValue = getActiveValue();
    // Get current value and split into whole/decimal parts
    let currentStr = currentValue.toString();
    
    // Handle floating point precision - truncate to 2 decimals
    if (currentStr.includes('.')) {
      const parts = currentStr.split('.');
      currentStr = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    
    const parts = currentStr.split('.');
    let wholePart = parts[0];
    let decimalPart = parts[1] || '';

    if (decimalMode) {
      // In decimal mode - append digit to decimal part
      decimalPart = decimalPart + value;
      // Limit to 2 decimal digits
      if (decimalPart.length > 2) {
        decimalPart = decimalPart.slice(0, 2);
      }
    } else {
      // In whole mode - append digit to whole part
      wholePart = wholePart + value;
    }

    // Build the new value
    let newValue: number;
    if (decimalPart.length > 0) {
      newValue = parseFloat(`${wholePart}.${decimalPart}`);
    } else {
      newValue = parseFloat(wholePart);
    }

    if (isNaN(newValue)) newValue = 0;

    if (activeField === 'z') setEditZ(newValue);
    else if (activeField === 'x') setEditX(newValue);
    else setEditR(newValue);
  };

  const handleClear = () => {
    if (activeField === 'z') setEditZ(0);
    if (activeField === 'x') setEditX(0);
    if (activeField === 'r') setEditR(0);
  };

  const handleBackspace = () => {
    const currentValue = getActiveValue();
    let currentStr = currentValue.toString();
    
    // Handle floating point precision issues
    if (currentStr.includes('.')) {
      const parts = currentStr.split('.');
      currentStr = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    
    const parts = currentStr.split('.');
    let wholePart = parts[0];
    let decimalPart = parts[1] || '';

    if (decimalMode && decimalPart.length > 0) {
      // Remove last digit from decimal part
      decimalPart = decimalPart.slice(0, -1);
      if (decimalPart.length === 0) {
        setDecimalMode(false);
      }
    } else {
      // Remove last digit from whole part
      wholePart = wholePart.slice(0, -1) || '0';
    }

    const newValue = decimalPart.length > 0 
      ? parseFloat(`${wholePart}.${decimalPart}`) 
      : parseFloat(wholePart);

    if (activeField === 'z') setEditZ(newValue);
    else if (activeField === 'x') setEditX(newValue);
    else setEditR(newValue);
  };

  const handleSave = () => {
    onSave(editZ, editX, editR);
  };

  const activeValue = getActiveValue();
  const formattedValue = formatValue(activeValue);

  // Determine which part of decimal is "active" based on length
  const decimalFirstDigit = formattedValue.decimal[0] || '0';
  const decimalSecondDigit = formattedValue.decimal[1] || '';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden input for keyboard capture */}
        <input
          ref={inputRef}
          type="text"
          className="opacity-0 absolute"
          style={{ position: 'absolute', left: '-9999px' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Edit Point #{index + 1}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ⌨️ Type numbers, Enter=Save, Esc=Cancel, ←→ switch fields, ./,=decimals
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* Value Display */}
        <div 
          className="p-4 bg-slate-900/50 cursor-ns-resize"
          onWheel={handleGlobalWheel}
          title="Scroll to adjust value"
        >
          <div className="text-center text-4xl font-mono font-bold">
            <span 
              className={`text-blue-400 cursor-pointer hover:bg-blue-400/20 rounded px-1 ${!decimalMode ? 'bg-blue-400/20 ring-2 ring-blue-500/50' : ''}`}
              onClick={() => setDecimalMode(false)}
            >
              {formattedValue.whole}
            </span>
            <span className="text-slate-500">.</span>
            <span 
              className={`cursor-pointer rounded px-1 ${
                decimalMode 
                  ? 'text-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-500/50' 
                  : 'text-slate-400 hover:bg-slate-400/20'
              }`}
              onClick={() => setDecimalMode(true)}
            >
              {decimalFirstDigit}{decimalSecondDigit}
            </span>
            <span className="text-slate-500 text-lg ml-2">mm</span>
          </div>
          <div className="text-center text-xs text-slate-500 mt-2">
            {activeField.toUpperCase()}: {decimalMode ? `Editing decimals (${formattedValue.decimal})` : 'Editing whole (units)'}
          </div>
        </div>

        {/* Field Selectors */}
        <div className="flex gap-2 p-4 border-b border-slate-700">
          <button
            onClick={() => { setActiveField('z'); setDecimalMode(0); }}
            className={`flex-1 py-3 px-4 rounded-lg font-mono text-lg transition-all ${
              activeField === 'z'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Z: {formatValue(editZ).whole}<span className="text-slate-400">.{formatValue(editZ).decimal}</span>
          </button>
          <button
            onClick={() => { setActiveField('x'); setDecimalMode(0); }}
            className={`flex-1 py-3 px-4 rounded-lg font-mono text-lg transition-all ${
              activeField === 'x'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            X: {formatValue(editX).whole}<span className="text-slate-400">.{formatValue(editX).decimal}</span>
          </button>
          <button
            onClick={() => { setActiveField('r'); setDecimalMode(0); }}
            className={`flex-1 py-3 px-4 rounded-lg font-mono text-lg transition-all ${
              activeField === 'r'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            R: {formatValue(editR).whole}<span className="text-slate-400">.{formatValue(editR).decimal}</span>
          </button>
        </div>

        {/* Adjustment Buttons */}
        <div className="flex gap-2 p-4 border-b border-slate-700">
          <button
            onMouseDown={() => adjustValue(activeField, -1)}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            <Minus size={24} className="mx-auto" />
          </button>
          <button
            onMouseDown={() => adjustValue(activeField, -0.1)}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-lg transition-colors"
          >
            -0.1
          </button>
          <button
            onMouseDown={() => adjustValue(activeField, 0.1)}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-lg transition-colors"
          >
            +0.1
          </button>
          <button
            onMouseDown={() => adjustValue(activeField, 1)}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            <Plus size={24} className="mx-auto" />
          </button>
        </div>

        {/* Numpad - 3 columns like real numpad */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-700">
          {/* Row 1: 1 2 3 */}
          <button
            onClick={() => handleNumpad('1')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            1
          </button>
          <button
            onClick={() => handleNumpad('2')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            2
          </button>
          <button
            onClick={() => handleNumpad('3')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            3
          </button>

          {/* Row 2: 4 5 6 */}
          <button
            onClick={() => handleNumpad('4')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            4
          </button>
          <button
            onClick={() => handleNumpad('5')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            5
          </button>
          <button
            onClick={() => handleNumpad('6')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            6
          </button>

          {/* Row 3: 7 8 9 */}
          <button
            onClick={() => handleNumpad('7')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            7
          </button>
          <button
            onClick={() => handleNumpad('8')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            8
          </button>
          <button
            onClick={() => handleNumpad('9')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            9
          </button>

          {/* Row 4: CLR 0 . */}
          <button
            onClick={handleClear}
            className="py-4 bg-red-600/80 hover:bg-red-600 rounded-lg text-white font-bold text-sm transition-colors"
          >
            CLR
          </button>
          <button
            onClick={() => handleNumpad('0')}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl transition-colors"
          >
            0
          </button>
          <button
            onClick={() => setDecimalMode(prev => !prev)}
            className={`py-4 rounded-lg font-bold text-xl transition-colors ${
              decimalMode 
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            .
          </button>

          {/* Row 5: Backspace (full width) */}
          <button
            onClick={handleBackspace}
            className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors col-span-3"
          >
            <ChevronDown size={24} className="mx-auto rotate-90" />
          </button>
        </div>

        {/* Fine Adjustment Hint */}
        <div className="p-3 bg-slate-900/30 text-center text-xs text-slate-400">
          🖱️ Scroll for ±0.1mm • Click . to toggle decimals
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
