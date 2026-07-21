import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Hero } from '../components/blocks/hero';
import { Features } from '../components/blocks/features';
import './globals.css';

export default function Landing() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-white dark:bg-[#05070a] font-sans antialiased text-zinc-900 dark:text-zinc-100 selection:bg-black/10">
        <Hero />
        <Features />
        
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 bg-white dark:bg-[#05070a] relative z-10">
          <div className="container max-w-5xl flex flex-col items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400 font-light">
            <p>© {new Date().getFullYear()} Inki. Designed with intention.</p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
