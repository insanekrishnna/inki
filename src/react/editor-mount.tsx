import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../components/ui/theme-provider';
import { SidebarProvider } from '../components/ui/sidebar';
import { EditorSidebar } from '../components/editor/EditorSidebar';
import './globals.css';

const container = document.getElementById('editor-sidebar-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <SidebarProvider>
          <EditorSidebar />
        </SidebarProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
