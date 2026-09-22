'use client';

import React, { useEffect } from 'react';
import { RotateCw, AlertTriangle, Home, LogOut } from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime exception caught by Error Boundary:', error);
  }, [error]);

  const handleFullReset = () => {
    try {
      localStorage.removeItem('devi_user_role');
      localStorage.removeItem('devi_user_phone');
      localStorage.removeItem('devi_user_name');
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white font-sans">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl border border-rose-500/30 text-center max-w-md w-full space-y-4 shadow-2xl animate-scaleUp">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        
        <h2 className="text-lg sm:text-xl font-black text-white">Temporary System Glitch</h2>
        
        <p className="text-xs text-slate-300">
          The app encountered a temporary render exception. Don't worry, all your sales records and database data are completely safe.
        </p>

        {error?.message && (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Reload & Try Again</span>
          </button>

          <button
            type="button"
            onClick={handleFullReset}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Reset Cache & Go To Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
