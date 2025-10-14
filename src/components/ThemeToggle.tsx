'use client';
import React from 'react';

const STORAGE_KEY = 'theme';

type Mode = 'light' | 'dark';

function apply(mode: Mode){
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function ThemeToggle(){
  const [mounted,setMounted]=React.useState(false);
  const [mode,setMode]=React.useState<Mode>('light');

  React.useEffect(()=>{
    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
    const initial: Mode = stored === 'dark' ? 'dark' : 'light';
    apply(initial);
    setMode(initial);
    setMounted(true);
    const onStorage = (e: StorageEvent) => {
      if(e.key === STORAGE_KEY){
        const val: Mode = e.newValue === 'dark' ? 'dark' : 'light';
        apply(val); setMode(val);
      }
    };
    window.addEventListener('storage', onStorage);
    return ()=> window.removeEventListener('storage', onStorage);
  },[]);

  const toggle = React.useCallback(()=>{
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    apply(next); setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  },[mode]);

  const reset = React.useCallback(()=>{
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    apply('light'); setMode('light');
  },[]);

  if(!mounted) return null;
  return (
    <div className="fixed z-50 bottom-4 right-4 flex gap-2">
      <button onClick={toggle} aria-label="Basculer le thème" className="px-3 h-9 rounded-full text-xs font-medium border border-base bg-surface shadow hover:opacity-80 transition">
        {mode==='dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
      <button onClick={reset} aria-label="Réinitialiser le thème" className="px-3 h-9 rounded-full text-xs font-medium border border-base bg-surface shadow hover:opacity-80 transition">
        Reset
      </button>
    </div>
  );
}
