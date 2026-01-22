"use client";
import { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  partType?: 'FULL' | 'HALF' | 'SUNSET' | 'AM' | 'PM';
  isStartTime?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = '--:--',
  min = '00:00',
  max = '23:59',
  disabled = false,
  label,
  className = '',
  partType,
  isStartTime = true,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parser la valeur initiale
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHour(h);
      setMinute(m);
    } else {
      setHour(null);
      setMinute(null);
    }
  }, [value]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Générer les heures disponibles
  const generateHours = () => {
    const [minHour, minMin] = min.split(':').map(Number);
    const [maxHour, maxMin] = max.split(':').map(Number);
    const hours: number[] = [];
    
    // Si on a déjà sélectionné une heure, filtrer selon les contraintes
    for (let h = 0; h <= 23; h++) {
      if (h < minHour || h > maxHour) continue;
      hours.push(h);
    }
    return hours;
  };

  // Générer les minutes disponibles (par pas de 15 minutes)
  const generateMinutes = () => {
    const [minHour, minMin] = min.split(':').map(Number);
    const [maxHour, maxMin] = max.split(':').map(Number);
    const allMinutes = [0, 15, 30, 45];
    
    // Filtrer les minutes selon les contraintes si une heure est sélectionnée
    if (hour !== null) {
      return allMinutes.filter(m => {
        if (hour === minHour && m < minMin) return false;
        if (hour === maxHour && m > maxMin) return false;
        return true;
      });
    }
    
    return allMinutes;
  };

  const handleHourSelect = (h: number) => {
    setHour(h);
    if (minute !== null) {
      const newValue = `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      onChange(newValue);
      setIsOpen(false);
    }
  };

  const handleMinuteSelect = (m: number) => {
    setMinute(m);
    if (hour !== null) {
      const newValue = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      onChange(newValue);
      setIsOpen(false);
    }
  };

  const displayValue = value || placeholder;
  const hours = generateHours();
  const minutes = generateMinutes();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2.5 rounded-lg border transition-all
          ${disabled 
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
            : isOpen
            ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-200'
            : 'border-gray-300 bg-white hover:border-blue-400 focus:border-blue-500'
          }
          text-left text-sm font-medium
          flex items-center justify-between
        `}
      >
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {displayValue}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex max-h-80">
            {/* Colonne des heures */}
            <div className="flex-1 overflow-y-auto border-r border-gray-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 sticky top-0 z-10">
                <p className="text-xs font-bold text-gray-700 text-center uppercase tracking-wide">Heure</p>
              </div>
              <div className="py-2">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`
                      w-full px-4 py-2.5 text-sm text-left transition-all duration-150
                      ${hour === h 
                        ? 'bg-blue-500 text-white font-bold shadow-sm' 
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-right">{String(h).padStart(2, '0')}</span>
                      <span className="text-xs opacity-70">h</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colonne des minutes */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 sticky top-0 z-10">
                <p className="text-xs font-bold text-gray-700 text-center uppercase tracking-wide">Minute</p>
              </div>
              <div className="py-2">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`
                      w-full px-4 py-2.5 text-sm text-left transition-all duration-150
                      ${minute === m 
                        ? 'bg-blue-500 text-white font-bold shadow-sm' 
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-right">{String(m).padStart(2, '0')}</span>
                      <span className="text-xs opacity-70">min</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestions rapides adaptées au créneau */}
          <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Suggestions rapides
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                // Suggestions adaptées selon le créneau
                let suggestions: string[] = [];
                
                if (partType === 'FULL') {
                  // Journée complète : heures de 8h à 18h
                  suggestions = isStartTime 
                    ? ['08:00', '09:00', '10:00', '11:00', '12:00']
                    : ['14:00', '15:00', '16:00', '17:00', '18:00'];
                } else if (partType === 'HALF') {
                  // Demi-journée : heures matin ou après-midi selon le contexte
                  if (isStartTime) {
                    // Heure de début : matin (8h-13h)
                    suggestions = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
                  } else {
                    // Heure de fin : après-midi (13h-18h) - mais généralement calculée automatiquement
                    suggestions = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
                  }
                } else if (partType === 'SUNSET') {
                  // Sunset : heures autour de 20h
                  suggestions = isStartTime 
                    ? ['19:00', '19:30', '20:00', '20:30', '21:00']
                    : ['21:00', '21:30', '22:00', '22:30', '23:00'];
                } else if (partType === 'AM') {
                  // Matin uniquement
                  suggestions = ['08:00', '09:00', '10:00', '11:00', '12:00'];
                } else if (partType === 'PM') {
                  // Après-midi uniquement
                  suggestions = isStartTime
                    ? ['13:00', '14:00', '15:00', '16:00']
                    : ['17:00', '18:00', '19:00', '20:00'];
                } else {
                  // Par défaut : toutes les heures courantes
                  suggestions = ['08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
                }
                
                return suggestions.map((suggestion) => {
                  const [sugHour, sugMin] = suggestion.split(':').map(Number);
                  const isInRange = hours.includes(sugHour) && (minutes.includes(sugMin) || sugMin === 0);
                  if (!isInRange) return null;
                  const isSelected = value === suggestion;
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        onChange(suggestion);
                        setIsOpen(false);
                      }}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150
                        ${isSelected
                          ? 'bg-blue-500 text-white shadow-md scale-105'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'
                        }
                      `}
                    >
                      {suggestion}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
