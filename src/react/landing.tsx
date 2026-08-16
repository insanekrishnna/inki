import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Analytics } from '@vercel/analytics/react';
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
        
        <footer className="landing-footer relative z-10 w-full h-[60vh] min-h-[440px] overflow-hidden">
          <Skiper39 />
        </footer>
      </div>
      <Analytics />
    </ThemeProvider>
  );
}
