import React, { useEffect, useState } from 'react'
import { SidebarGroup, SidebarGroupLabel, useSidebar } from '../ui/sidebar'
import { cn } from '../../lib/utils'

const COLORS = [
  { value: '#f97316', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#111111', label: 'Black' },
]

const STROKES = [
  { value: 2, height: '1.5px', label: 'Thin' },
  { value: 4, height: '3px', label: 'Regular' },
  { value: 8, height: '5.5px', label: 'Bold' },
]

export function EditorSidebarAppearance() {
  const { open } = useSidebar()
  const [activeColor, setActiveColor] = useState('#f97316')
  const [activeStroke, setActiveStroke] = useState(4)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.currentColor) setActiveColor(detail.currentColor)
      if (detail?.strokeWidth) setActiveStroke(detail.strokeWidth)
    }
    window.addEventListener('editor-state-change', handler)
    return () => window.removeEventListener('editor-state-change', handler)
  }, [])

  const selectColor = (color: string) => {
    setActiveColor(color)
    const w = window as any
    if (typeof w.editorSelectColor === 'function') w.editorSelectColor(color)
  }

  const selectStroke = (width: number) => {
    setActiveStroke(width)
    const w = window as any
    if (typeof w.editorSelectStrokeWidth === 'function') w.editorSelectStrokeWidth(width)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Appearance</SidebarGroupLabel>
      
      {/* Color swatches */}
      <div className={cn("flex gap-1.5 px-2 flex-wrap", !open && "justify-center")}>
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => selectColor(color.value)}
            title={color.label}
            className={cn(
              "w-6 h-6 rounded-full transition-all border-2 shrink-0",
              activeColor === color.value
                ? "border-black dark:border-white scale-110 shadow-sm"
                : "border-transparent hover:scale-105"
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>

      {/* Stroke width */}
      {open && <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2 mt-2 mb-1">Stroke</div>}
      <div className={cn("flex gap-1 px-2 mt-1", !open && "flex-col items-center mt-2")}>
        {STROKES.map((stroke) => (
          <button
            key={stroke.value}
            onClick={() => selectStroke(stroke.value)}
            title={stroke.label}
            className={cn(
              "flex items-center justify-center rounded-md transition-colors",
              open ? "flex-1 h-8" : "w-8 h-8",
              activeStroke === stroke.value
                ? "bg-black/5 dark:bg-white/10 text-black dark:text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            )}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: open ? '24px' : '16px', height: stroke.height }}
            />
          </button>
        ))}
      </div>
    </SidebarGroup>
  )
}
