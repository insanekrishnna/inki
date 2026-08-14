import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Hero } from '../components/blocks/hero';
import { Features } from '../components/blocks/features';
import { Skiper39 } from '../components/ui/skiper-ui/skiper39';
import './globals.css';

export default function Landing() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="landing-page min-h-screen font-sans antialiased selection:bg-black/10">
        <Hero />
        <Features />
        
        <footer className="landing-footer relative z-10 h-[72vh] min-h-[520px] overflow-hidden">
          <Skiper39 />
        </footer>
      </div>
    </ThemeProvider>
  );
}
