import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '../components/ui/theme-provider'
import { SidebarProvider } from '../components/ui/sidebar'
import { EditorSidebar } from '../components/editor/EditorSidebar'

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <SidebarProvider>
        <EditorSidebar />
      </SidebarProvider>
      <Analytics />
    </ThemeProvider>
  )
}
