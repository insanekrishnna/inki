import React from 'react'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { Navbar } from '@/components/ui/navbar'

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="min-h-screen w-full relative transition-colors duration-300">
        <Navbar />
      </div>
    </ThemeProvider>
  )
}
