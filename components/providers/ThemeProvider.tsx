'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'chaitanya' | 'nitai' | 'varaha' | 'rama' | 'radharani' | 'govinda' | 'yamuna' | 'krishna';

export const THEMES: { id: ThemeType; name: string; color: string; dot: string }[] = [
  { id: 'chaitanya',  name: 'Chaitanya',  color: '#f97316', dot: 'bg-orange-500'  },
  { id: 'nitai',      name: 'Nitai',      color: '#2563eb', dot: 'bg-blue-600'    },
  { id: 'varaha',     name: 'Varaha',     color: '#7e22ce', dot: 'bg-purple-700'  },
  { id: 'rama',       name: 'Rama',       color: '#059669', dot: 'bg-emerald-600' },
  { id: 'radharani',  name: 'Radharani',  color: '#e11d48', dot: 'bg-rose-600'    },
  { id: 'govinda',    name: 'Govinda',    color: '#475569', dot: 'bg-slate-600'   },
  { id: 'yamuna',     name: 'Yamuna',     color: '#b45309', dot: 'bg-amber-700'   },
  { id: 'krishna',    name: 'Krishna',    color: '#0a0a0f', dot: 'bg-gray-950 border border-gray-600' },
];

interface ThemeContextType {
  theme: ThemeType;
  themeName: string;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'chaitanya',
  themeName: 'Chaitanya',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('chaitanya');

  // On mount: read saved theme and apply to <html>
  useEffect(() => {
    const saved = (localStorage.getItem('site-theme') as ThemeType) || 'chaitanya';
    applyTheme(saved);
    setThemeState(saved);
  }, []);

  function applyTheme(t: ThemeType) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('site-theme', t);
  }

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const themeName = THEMES.find(t => t.id === theme)?.name ?? 'Chaitanya';

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
