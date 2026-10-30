import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-2 rounded-xl transition-all border shadow-sm flex items-center justify-center cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-300 text-royal-700 dark:bg-dark-800 dark:hover:bg-dark-700 dark:border-dark-600 dark:text-amber-400"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 animate-spin-slow transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}

