import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Bell,
  Bold,
  ChevronDown,
  ChevronsUpDown,
  Circle,
  Crop,
  Grid3X3,
  Info,
  Italic,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Underline,
  Undo2,
  Wand2,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '../ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import { cn } from '../../lib/utils'

const TOOLS = [
  { id: 'crop', label: 'Crop', icon: Crop, shortcut: '' },
  { id: 'select', label: 'Select / Move', icon: MousePointer2, shortcut: 'V' },
  { id: 'rect', label: 'Rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, shortcut: 'E' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, shortcut: 'A' },
  { id: 'text', label: 'Text', icon: Type, shortcut: 'T' },
  { id: 'line', label: 'Line', icon: Minus, shortcut: 'L' },
  { id: 'pixelate', label: 'Pixelate', icon: Grid3X3, shortcut: 'P' }
] as const

const COLORS = [
  { value: '#111111', label: 'Black' },
  { value: '#ffffff', label: 'White' },
  { value: '#ef4444', label: 'Red' },
  { value: '#22c55e', label: 'Green' },
]

const STROKES = [
  { value: 2, height: '1.5px', label: 'Thin' },
  { value: 4, height: '3px', label: 'Regular' },
  { value: 8, height: '5.5px', label: 'Bold' },
]

/* ─── Shared class tokens ─────────────────────────────────────────────── */

const sidebarButtonClass =
  'h-8 !rounded-md text-neutral-600 dark:text-neutral-400 transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-neutral-100/70 dark:hover:bg-white/[0.06] hover:text-neutral-900 dark:hover:text-white active:translate-y-0 active:scale-[0.98]'

const sidebarIconClass = 'size-[16px] shrink-0 text-neutral-500 dark:text-neutral-400'

const sidebarMenuClass = 'gap-0.5 px-3'

const sidebarGroupLabelClass =
  'px-5 py-1.5 text-[11px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500 uppercase transition-[opacity,transform] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]'

function getSidebarButtonStyle(isCollapsed: boolean): React.CSSProperties | undefined {
  if (isCollapsed) return undefined
  return { paddingLeft: 20, paddingRight: 20 }
}

// Small reusable "keyboard key" chip. Sits close to the label instead of
// being pinned to the far edge of the sidebar, and has its own border/bg
// so it doesn't visually collide with the sidebar's outer border.
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center font-mono text-neutral-400/60 dark:text-white/50 shrink-0 border border-black/[0.04] dark:border-white/15"
      style={{
        height: 18,
        minWidth: 18,
        paddingLeft: 5,
        paddingRight: 5,
        marginRight: 2,
        fontSize: 10,
        lineHeight: 1,
        borderRadius: 4,
        background: 'transparent',
      }}
    >
      {children}
    </kbd>
  )
}

/* ─── Header ──────────────────────────────────────────────────────────── */

function SidebarBrand() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarHeader
      className={cn(
        'flex border-b border-neutral-100/80 dark:border-white/5',
        isCollapsed
          ? 'flex-col items-center justify-start gap-y-0 pb-3 px-2 min-h-[52px]'
          : 'flex-row items-center justify-between py-3 min-h-[56px]'
      )}
      style={isCollapsed ? { paddingTop: 12 } : { paddingLeft: 20, paddingRight: 20 }}
    >
      <a className="group flex min-w-0 items-center gap-2.5 outline-none" href="#">
        <img src="/inki.png" alt="Icodraw" className={cn('shrink-0 object-contain object-left drop-shadow-sm transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105', isCollapsed ? 'size-[22px]' : 'size-[26px]')} />
      </a>

      <motion.div
        animate={{ opacity: 1 }}
        className={cn('flex items-center', isCollapsed ? 'flex-row md:flex-col-reverse' : 'flex-row')}
        initial={{ opacity: 0 }}
        key={isCollapsed ? 'editor-header-collapsed' : 'editor-header-expanded'}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <SidebarTrigger className="shrink-0 size-7 rounded-md border border-transparent bg-transparent text-neutral-400 transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-neutral-50 hover:text-neutral-700 active:translate-y-0 active:scale-[0.96] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white" />
      </motion.div>
    </SidebarHeader>
  )
}

/* ─── Tools ────────────────────────────────────────────────────────────── */

function EditorSidebarTools() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [activeTool, setActiveTool] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.currentTool !== undefined) setActiveTool(detail.currentTool)
    }
    window.addEventListener('editor-state-change', handler)
    return () => window.removeEventListener('editor-state-change', handler)
  }, [])

  const selectTool = (tool: string) => {
    window.dispatchEvent(new CustomEvent('react-tool-select', { detail: { tool } }))
    setActiveTool(tool)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={sidebarGroupLabelClass}>Tools</SidebarGroupLabel>
      <SidebarMenu className={sidebarMenuClass}>
        {TOOLS.map((tool) => (
          <SidebarMenuItem key={tool.id}>
            <SidebarMenuButton
              className={cn(
                sidebarButtonClass,
                activeTool === tool.id && 'bg-neutral-100/80 text-neutral-900 dark:bg-white/[0.08] dark:text-white',
                isCollapsed && 'justify-center px-0'
              )}
              isActive={activeTool === tool.id}
              onClick={() => selectTool(tool.id)}
              style={getSidebarButtonStyle(isCollapsed)}
              tooltip={tool.label}
            >
              <tool.icon className={cn(sidebarIconClass, activeTool === tool.id && 'text-neutral-800 dark:text-white')} />
              {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in slide-in-from-left-1 duration-[360ms]">{tool.label}</span>}
              {!isCollapsed && tool.shortcut && <span className="animate-in fade-in slide-in-from-left-1 duration-[360ms]"><ShortcutKey>{tool.shortcut}</ShortcutKey></span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

/* ─── Text Options ─────────────────────────────────────────────────────── */

const FONTS = [
  { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Arial', value: "Arial, sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Georgia', value: "Georgia, serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Verdana', value: "Verdana, sans-serif" },
];

function EditorSidebarText() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [fontFamily, setFontFamily] = useState(FONTS[0].value)
  const [fontSize, setFontSize] = useState(30)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.currentTool !== undefined) setActiveTool(detail.currentTool)
      if (detail?.textFontFamily) setFontFamily(detail.textFontFamily)
      if (detail?.textFontSize) setFontSize(detail.textFontSize)
      if (detail?.textBold !== undefined) setIsBold(detail.textBold)
      if (detail?.textItalic !== undefined) setIsItalic(detail.textItalic)
      if (detail?.textUnderline !== undefined) setIsUnderline(detail.textUnderline)
    }
    window.addEventListener('editor-state-change', handler)
    return () => window.removeEventListener('editor-state-change', handler)
  }, [])

  // Only show text options when the text tool is active and sidebar is expanded
  if (activeTool !== 'text' || isCollapsed) return null;

  const selectFontFamily = (val: string) => {
    setFontFamily(val)
    const w = window as any
    if (typeof w.editorSelectFontFamily === 'function') w.editorSelectFontFamily(val)
  }

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(120, fontSize + delta))
    setFontSize(newSize)
    const w = window as any
    if (typeof w.editorSelectFontSize === 'function') w.editorSelectFontSize(newSize)
  }

  const toggleBold = () => {
    setIsBold(!isBold)
    const w = window as any
    if (typeof w.editorSelectTextBold === 'function') w.editorSelectTextBold()
  }

  const toggleItalic = () => {
    setIsItalic(!isItalic)
    const w = window as any
    if (typeof w.editorSelectTextItalic === 'function') w.editorSelectTextItalic()
  }

  const toggleUnderline = () => {
    setIsUnderline(!isUnderline)
    const w = window as any
    if (typeof w.editorSelectTextUnderline === 'function') w.editorSelectTextUnderline()
  }

  return (
    <SidebarGroup>
      {!isCollapsed && <SidebarGroupLabel className={sidebarGroupLabelClass}>Text options</SidebarGroupLabel>}
      <div 
        className={cn(
          isCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-2.5',
          'px-5 pt-1 pb-1'
        )}
        style={{ paddingLeft: 9       , paddingRight: 9 }}
      >
        
        {/* Font Family Dropdown */}
        {!isCollapsed && (
          <div className={cn("rs-custom-select", isFontDropdownOpen && "open")} style={{ width: '100%', marginBottom: 4 }}>
            <div 
              className="rs-select-value" 
              onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
            >
              <span>{FONTS.find(f => f.value === fontFamily)?.label || 'System'}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            
            {isFontDropdownOpen && (
              <div 
                className="fixed mt-1 bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-md py-1 shadow-lg z-[200] overflow-hidden flex flex-col w-[200px]"
                style={{ top: 'auto' }}
              >
                {FONTS.map(f => (
                  <div
                    key={f.value}
                    onClick={() => {
                      selectFontFamily(f.value)
                      setIsFontDropdownOpen(false)
                    }}
                    className={cn(
                      "cursor-pointer py-1.5 px-3 transition-colors hover:bg-neutral-100 dark:hover:bg-white/10 text-xs text-neutral-800 dark:text-neutral-200",
                      fontFamily === f.value && "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                    )}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
            {isFontDropdownOpen && (
              <div 
                className="fixed inset-0 z-[199]" 
                onClick={() => setIsFontDropdownOpen(false)} 
              />
            )}
          </div>
        )}

        {/* Size and Toggles Row */}
        <div className={cn(isCollapsed ? 'flex flex-col gap-2' : 'flex flex-row items-center gap-3')}>
          <div className="flex items-center justify-between bg-neutral-80/80 dark:bg-white/[0.04] rounded-sm h-8 p-1 flex-1 min-w-0 transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] border border-neutral-200/50 dark:border-white/[0.08]">
            <button onClick={() => changeFontSize(-4)} className="size-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94]">
              <Minus className="size-3" />
            </button>
            {!isCollapsed && <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 tabular-nums text-center flex-1">{fontSize}px</span>}
            <button onClick={() => changeFontSize(4)} className="size-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94]">
              <Plus className="size-3" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 bg-neutral-80/80 dark:bg-white/[0.04] h-8 p-1 rounded-sm transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] border border-neutral-200/50 dark:border-white/[0.08] shrink-0">
            <button onClick={toggleBold} className={cn("size-7 flex items-center justify-center rounded-md text-[13px] font-bold transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94]", isBold ? "bg-neutral-200/80 dark:bg-white/20 text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10")}>
              B
            </button>
            <button onClick={toggleItalic} className={cn("size-7 flex items-center justify-center rounded-md text-[13px] italic font-serif transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94]", isItalic ? "bg-neutral-200/80 dark:bg-white/20 text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10")}>
              I
            </button>
            <button onClick={toggleUnderline} className={cn("size-7 flex items-center justify-center rounded-md text-[13px] underline transition-all duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.94]", isUnderline ? "bg-neutral-200/80 dark:bg-white/20 text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10")}>
              U
            </button>
          </div>
        </div>

      </div>
    </SidebarGroup>
  )
}

/* ─── Appearance ───────────────────────────────────────────────────────── */

function EditorSidebarAppearance() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [activeColor, setActiveColor] = useState('#111111')
  const [activeStroke, setActiveStroke] = useState(4)
  const customColorInputRef = useRef<HTMLInputElement>(null)
  const [customColor, setCustomColor] = useState<string | null>(null)

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

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value)
    selectColor(e.target.value)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={sidebarGroupLabelClass}>Appearance</SidebarGroupLabel>

      <div
        className={cn(isCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-wrap items-center gap-2.5')}
        style={isCollapsed ? { paddingTop: 6, paddingBottom: 6, paddingLeft: 8, paddingRight: 8 } : { paddingTop: 6, paddingBottom: 10, paddingLeft: 20, paddingRight: 20 }}
      >
        {COLORS.filter(color => !isCollapsed || color.value === '#111111' || color.value === '#ef4444')
          .sort((a, b) => {
            if (isCollapsed) {
              if (a.value === '#111111') return -1
              if (a.value === '#ef4444') return 1
            }
            return 0
          })
          .map((color) => (
          <button
            key={color.value}
            onClick={() => selectColor(color.value)}
            title={color.label}
            className={cn(
              cn('shrink-0 rounded-full border-[1.5px] transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:shadow-sm active:scale-95 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]', isCollapsed ? 'size-[22px]' : 'size-[26px]'),
              activeColor === color.value
                ? 'scale-110 border-neutral-800 ring-2 ring-neutral-200/60'
                : 'border-transparent hover:border-neutral-200'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}

        {/* Custom color swatch opens the native color picker. */}
        <button
          onClick={() => customColorInputRef.current?.click()}
          title="Custom color"
          className={cn(
            cn('relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 active:scale-95', isCollapsed ? 'size-[22px]' : 'size-[26px]'),
            customColor && activeColor === customColor
              ? 'scale-110 border-neutral-800 ring-2 ring-neutral-200/60'
              : 'border-dashed border-neutral-300 hover:border-neutral-400'
          )}
          style={customColor ? { backgroundColor: customColor, borderStyle: 'solid' } : undefined}
        >
          {!customColor && <Plus className="size-2.5 text-neutral-400" />}
          <input
            ref={customColorInputRef}
            type="color"
            value={customColor ?? activeColor}
            onChange={handleCustomColorChange}
            className="sr-only"
            aria-label="Pick a custom color"
          />
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div
            className="text-[11px] font-medium tracking-wide uppercase text-neutral-400 dark:text-neutral-500 animate-in fade-in slide-in-from-left-1 duration-[360ms]"
            style={{ paddingTop: 4, paddingBottom: 6, paddingLeft: 20 }}
          >
            Stroke
          </div>
          <div
            className="flex flex-col gap-0.5"
            style={{ paddingLeft: 12, paddingRight: 12 }}
          >
            {STROKES.map((stroke) => (
              <button
                key={stroke.value}
                onClick={() => selectStroke(stroke.value)}
                title={stroke.label}
                className={cn(
                  'flex h-8 w-full items-center rounded-md transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-neutral-100/70 active:translate-y-0 active:scale-[0.98] dark:hover:bg-white/10 dark:text-white/80',
                  'justify-center',
                  activeStroke === stroke.value ? 'bg-neutral-100/80 text-neutral-900 dark:bg-white/10 dark:text-white' : 'text-neutral-400 dark:text-white/60'
                )}
              >
                <span className="rounded-full bg-current transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: '28px', height: stroke.height }} />
              </button>
            ))}
          </div>
        </>
      )}
    </SidebarGroup>
  )
}

/* ─── History ──────────────────────────────────────────────────────────── */

function EditorSidebarHistory() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const w = window as any

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={sidebarGroupLabelClass}>History</SidebarGroupLabel>
      <SidebarMenu className={sidebarMenuClass}>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed && 'justify-center px-0')}
            onClick={() => w.editorUndo?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Undo"
          >
            <Undo2 className={sidebarIconClass} />
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in slide-in-from-left-1 duration-[360ms]">Undo</span>}
            {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-1 duration-[360ms]"><ShortcutKey>Ctrl Z</ShortcutKey></span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed && 'justify-center px-0')}
            onClick={() => w.editorRedo?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Redo"
          >
            <Redo2 className={sidebarIconClass} />
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in slide-in-from-left-1 duration-[360ms]">Redo</span>}
            {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-1 duration-[360ms]"><ShortcutKey>Ctrl Shift Z</ShortcutKey></span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed && 'justify-center px-0')}
            onClick={() => w.editorClear?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Clear canvas"
          >
            <Trash2 className={sidebarIconClass} />
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in slide-in-from-left-1 duration-[360ms]">Clear Canvas</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────── */

function EditorSidebarFooter() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarFooter className="border-t border-neutral-100/80 dark:border-white/5 !px-0 !gap-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <button
        onClick={() => window.open('https://github.com/prathm-k/inki', '_blank')}
        className={cn(
          'group flex h-[52px] w-full items-center gap-2.5 !rounded-none text-left transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-neutral-50 dark:hover:bg-white/10',
          isCollapsed ? 'justify-center px-0' : ''
        )}
        style={isCollapsed ? undefined : { paddingLeft: 20, paddingRight: 20 }}
        title="Shortcuts & Info"
        type="button"
      >
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 animate-in fade-in slide-in-from-left-1 duration-[360ms]">
            <img src="/inki.png" alt="Icodraw" className="size-[24px] shrink-0 object-contain object-left drop-shadow-sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-5 text-neutral-900 dark:text-white">Icodraw</span>
              <span className="block truncate text-[11px] font-normal leading-4 text-neutral-400 dark:text-white/60">Free</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-normal text-neutral-400 dark:text-white/70">
              <span>v0.1.0</span>
              <ChevronsUpDown className="size-3" />
            </span>
          </div>
        )}
      </button>
    </SidebarFooter>
  )
}

/* ─── Main Sidebar ─────────────────────────────────────────────────────── */

export function EditorSidebar() {
  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className={cn(
        "!fixed !inset-y-0 !left-0 !h-full z-[100]",
        "[&>div]:!h-full",
        "[&_[data-sidebar=sidebar]]:!h-full",
        "[&_[data-sidebar=sidebar]]:rounded-none",
        "[&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-l-0 [&_[data-sidebar=sidebar]]:border-t-0 [&_[data-sidebar=sidebar]]:border-b-0 [&_[data-sidebar=sidebar]]:border-black/[0.06] dark:[&_[data-sidebar=sidebar]]:border-white/[0.08]",
        "[&_[data-sidebar=sidebar]]:bg-white dark:[&_[data-sidebar=sidebar]]:bg-[#0a0a0a]",
        "[&_[data-sidebar=sidebar]]:py-2"
      )}
    >
      <SidebarBrand />
      <SidebarContent className="gap-0 pb-4 pt-3 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:gap-0 overflow-y-auto overflow-x-hidden">
        <EditorSidebarTools />
        <SidebarSeparator className="my-2 mx-4 opacity-50" />
        <EditorSidebarText />
        <SidebarSeparator className="my-2 mx-4 opacity-50" />
        <EditorSidebarAppearance />
        <SidebarSeparator className="my-2 mx-4 opacity-50" />
        <EditorSidebarHistory />
      </SidebarContent>
      <EditorSidebarFooter />
    </Sidebar>
  )
}
