import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Crop, Monitor, MousePointer2, Type, Minus, Square, Circle, Wand2, Image as ImageIcon } from 'lucide-react';
import { ToggleTheme } from './toggle-theme';
import { cn } from '@/lib/utils';

export function Navbar() {
  const triggerCapture = (mode: string) => {
    // This connects to the vanilla renderer.js
    if (typeof (window as any).startCaptureRegion === 'function') {
      if (mode === 'region') (window as any).startCaptureRegion();
      else if (mode === 'window') (window as any).startCaptureWindow();
      else if (mode === 'fullscreen') (window as any).startCaptureFullscreen();
    }
  };

  const triggerTool = (tool: string) => {
    // Dispatch custom event that renderer.js can listen to
    window.dispatchEvent(new CustomEvent('react-tool-select', { detail: { tool } }));
  };

  return (
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md rounded-full shadow-lg border border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-4">
        <div className="font-bold text-lg mr-2 tracking-tight">INKI</div>
        <ToggleTheme />
      </div>

      <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-4">
        <NavButton onClick={() => triggerCapture('region')} icon={<Crop size={18} />} label="Region" />
        <NavButton onClick={() => triggerCapture('window')} icon={<Monitor size={18} />} label="Window" />
        <NavButton onClick={() => triggerCapture('fullscreen')} icon={<Camera size={18} />} label="Full" />
      </div>

      <div className="flex items-center gap-1">
        <NavButton onClick={() => triggerTool('select')} icon={<MousePointer2 size={18} />} label="Select" />
        <NavButton onClick={() => triggerTool('rect')} icon={<Square size={18} />} label="Rect" />
        <NavButton onClick={() => triggerTool('ellipse')} icon={<Circle size={18} />} label="Ellipse" />
        <NavButton onClick={() => triggerTool('arrow')} icon={<Minus size={18} className="rotate-45" />} label="Arrow" />
        <NavButton onClick={() => triggerTool('text')} icon={<Type size={18} />} label="Text" />
        <NavButton onClick={() => triggerTool('magic-wand')} icon={<Wand2 size={18} />} label="Wand" />
      </div>
    </motion.div>
  );
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors",
        "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
        "dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
      )}
      title={label}
    >
      {icon}
    </motion.button>
  );
}
