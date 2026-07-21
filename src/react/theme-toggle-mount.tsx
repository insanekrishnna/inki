import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToggleTheme } from '../components/ui/toggle-theme';
import { ThemeProvider } from 'next-themes';
import './globals.css';

// Clear any stale dark theme so light is always the default on fresh load
const storedTheme = localStorage.getItem('theme');
if (!storedTheme) {
  localStorage.setItem('theme', 'light');
}

const container = document.getElementById('react-theme-toggle-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
      <ToggleTheme />
    </ThemeProvider>
  );
}
