import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToggleTheme } from '../components/ui/toggle-theme';
import { ThemeProvider } from 'next-themes';
import './globals.css';

const container = document.getElementById('react-theme-toggle-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToggleTheme />
    </ThemeProvider>
  );
}
