import { create } from 'zustand';

const saved = localStorage.getItem('cf_theme') || 'dark';
document.documentElement.setAttribute('data-theme', saved);

export const useTheme = create((set) => ({
  theme: saved,
  toggle: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cf_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  }),
}));
