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
  SidebarRail,
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
  { value: '#3b82f6', label: 'Blue' },
  { value: '#a855f7', label: 'Purple' },
]

const STROKES = [
  { value: 2, height: '1.5px', label: 'Thin' },
  { value: 4, height: '3px', label: 'Regular' },
  { value: 8, height: '5.5px', label: 'Bold' },
]

const sidebarButtonClass =
  'h-8 !rounded-none text-[#333] dark:text-neutral-300 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-50 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
const sidebarButtonInsetClass = 'px-2.5'
const sidebarIconClass = 'size-[18px] shrink-0 text-[#333] dark:text-neutral-300'
const sidebarMenuClass = 'gap-0'
const sidebarGroupLabelClass = 'px-0 transition-opacity duration-500'

function getSidebarButtonStyle(isCollapsed: boolean): React.CSSProperties | undefined {
  if (isCollapsed) return undefined
  return { paddingLeft: 20, paddingRight: 16 }
}

// Small reusable "keyboard key" chip. Sits close to the label instead of
// being pinned to the far edge of the sidebar, and has its own border/bg
// so it doesn't visually collide with the sidebar's outer border.
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center font-mono text-neutral-400/70 dark:text-white/70 shrink-0 border border-black/5 dark:border-white/20"
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

function SidebarBrand() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarHeader
      className={cn(
        'flex min-h-[56px] border-b border-neutral-100/80 dark:border-white/5',
        isCollapsed
          ? 'flex-col items-center justify-start gap-y-0 py-3'
          : 'flex-row items-center justify-between py-3'
      )}
      style={{ paddingLeft: 4, paddingRight: 16 }}
    >
      <a className="group flex min-w-0 items-center gap-2.5 outline-none" href="#">
        <img src="/inki.png" alt="Icodraw" className="size-[26px] shrink-0 object-contain object-left drop-shadow-sm transition-transform duration-200 group-hover:scale-105" />
      </a>

      <motion.div
        animate={{ opacity: 1 }}
        className={cn('flex items-center', isCollapsed ? 'flex-row md:flex-col-reverse' : 'flex-row')}
        initial={{ opacity: 0 }}
        key={isCollapsed ? 'editor-header-collapsed' : 'editor-header-expanded'}
        transition={{ duration: 0.25 }}
      >
        <SidebarTrigger className="shrink-0 size-7 rounded-md border border-transparent bg-transparent text-neutral-400 transition-all duration-500 hover:bg-neutral-50 hover:text-neutral-700 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white" />
      </motion.div>
    </SidebarHeader>
  )
}

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
                activeTool === tool.id && 'bg-neutral-100/80 text-neutral-900 font-semibold dark:bg-white/10 dark:text-white',
                isCollapsed && 'justify-center px-0'
              )}
              isActive={activeTool === tool.id}
              onClick={() => selectTool(tool.id)}
              style={getSidebarButtonStyle(isCollapsed)}
              tooltip={tool.label}
            >
              <tool.icon className={cn(sidebarIconClass, activeTool === tool.id && 'text-neutral-700')} />
              {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in duration-500">{tool.label}</span>}
              {!isCollapsed && tool.shortcut && <span className="animate-in fade-in duration-500"><ShortcutKey>{tool.shortcut}</ShortcutKey></span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

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
  const [fontSize, setFontSize] = useState(44)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

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

  if (activeTool !== 'text' && activeTool !== 'select') return null;

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
        className={cn(isCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-2', 'pt-2 pb-4')}
        style={{ paddingLeft: isCollapsed ? '0' : '20px', paddingRight: isCollapsed ? '0' : '20px' }}
      >
        
        {/* Font Family Dropdown */}
        {!isCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md h-8 px-3 text-[13px] text-neutral-700 dark:text-neutral-200 outline-none transition-colors border border-transparent dark:border-white/10 focus-visible:ring-2 focus-visible:ring-neutral-200">
                <span className="truncate">{FONTS.find(f => f.value === fontFamily)?.label || 'System'}</span>
                <ChevronDown className="size-4 text-neutral-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }} 
              className="min-w-[180px] bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-md py-1 shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-50 font-['Inter',system-ui,sans-serif] text-[12px] text-[#333] dark:text-[#e5e5e5]"
            >
              {FONTS.map(f => (
                <DropdownMenuItem
                  key={f.value}
                  onClick={() => {
                    setFontFamily(f.value)
                    const w = window as any
                    if (typeof w.editorSelectFontFamily === 'function') w.editorSelectFontFamily(f.value)
                  }}
                  className={cn(
                    "cursor-pointer py-[6px] px-[10px] transition-colors rounded-none outline-none",
                    fontFamily === f.value 
                      ? "bg-blue-500 text-white dark:bg-blue-500" 
                      : "hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10"
                  )}
                >
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Size and Toggles Row */}
        <div className={cn(isCollapsed ? 'flex flex-col gap-2' : 'flex flex-row items-center gap-2')}>
          <div className="flex items-center justify-between bg-neutral-100 dark:bg-white/5 rounded-md h-8 px-2 flex-1 min-w-0 transition-colors">
            <button onClick={() => changeFontSize(-4)} className="size-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors">
              <Minus className="size-3" />
            </button>
            {!isCollapsed && <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{fontSize}px</span>}
            <button onClick={() => changeFontSize(4)} className="size-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors">
              <Plus className="size-3" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-white/5 p-0.5 rounded-md transition-colors">
            <button onClick={toggleBold} className={cn("size-7 flex items-center justify-center rounded text-[13px] font-bold transition-colors", isBold ? "bg-black/10 dark:bg-white/20 text-black dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10")}>
              B
            </button>
            <button onClick={toggleItalic} className={cn("size-7 flex items-center justify-center rounded text-[13px] italic font-serif transition-colors", isItalic ? "bg-black/10 dark:bg-white/20 text-black dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10")}>
              I
            </button>
            <button onClick={toggleUnderline} className={cn("size-7 flex items-center justify-center rounded text-[13px] underline transition-colors", isUnderline ? "bg-black/10 dark:bg-white/20 text-black dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10")}>
              U
            </button>
          </div>
        </div>

      </div>
    </SidebarGroup>
  )
}

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
        className={cn(isCollapsed ? 'flex flex-col items-center gap-1.5' : 'flex flex-wrap gap-2')}
        style={{ paddingTop: 10, paddingBottom: 16, paddingLeft: 10, paddingRight: 10 }}
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
              'size-[22px] shrink-0 rounded-full border-[1.5px] transition-all duration-500 hover:scale-110 hover:shadow-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]',
              activeColor === color.value
                ? 'scale-110 border-neutral-900 ring-2 ring-neutral-200/60'
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
            'relative flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-500 hover:scale-110',
            customColor && activeColor === customColor
              ? 'scale-110 border-neutral-900 ring-2 ring-neutral-200/60'
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
        <div
          className="text-[11px] font-medium text-[#111] dark:text-neutral-300 animate-in fade-in duration-500"
          style={{ paddingTop: 18, paddingBottom: 8, paddingLeft: 20 }}
        >
          Stroke
        </div>
      )}
      <div
        className={cn('flex', isCollapsed ? 'flex-col items-center pt-1 gap-0.5 px-0' : 'flex-col gap-0.5')}
        style={isCollapsed ? undefined : { paddingLeft: 10, paddingRight: 10 }}
      >
        {STROKES.map((stroke) => (
          <button
            key={stroke.value}
            onClick={() => selectStroke(stroke.value)}
            title={stroke.label}
            className={cn(
              'flex h-8 w-full items-center !rounded-none transition-all duration-500 hover:bg-neutral-50 dark:hover:bg-white/10 dark:text-white/80',
              'justify-center',
              activeStroke === stroke.value ? 'bg-neutral-100/80 text-neutral-900 dark:bg-white/10 dark:text-white' : 'text-neutral-400 dark:text-white/60'
            )}
          >
            <span className="rounded-full bg-current transition-all duration-500" style={{ width: !isCollapsed ? '24px' : '14px', height: stroke.height }} />
          </button>
        ))}
      </div>
    </SidebarGroup>
  )
}

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
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in duration-500">Undo</span>}
            {!isCollapsed && <span className="animate-in fade-in duration-500"><ShortcutKey>Ctrl Z</ShortcutKey></span>}
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
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in duration-500">Redo</span>}
            {!isCollapsed && <span className="animate-in fade-in duration-500"><ShortcutKey>Ctrl Shift Z</ShortcutKey></span>}
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
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium animate-in fade-in duration-500">Clear Canvas</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function EditorSidebarFooter() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarFooter className="border-t border-neutral-100/80 dark:border-white/5 !px-0 !gap-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <button
        onClick={() => window.open('https://github.com/prathm-k/inki', '_blank')}
        className={cn(
          'group flex h-14 w-full items-center gap-2 !rounded-none text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-50 dark:hover:bg-white/10',
          isCollapsed ? 'justify-center px-0' : ''
        )}
        style={isCollapsed ? undefined : { paddingLeft: 0, paddingRight: 16 }}
        title="Shortcuts & Info"
        type="button"
      >
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2 animate-in fade-in duration-500">
            <img src="/inki.png" alt="Icodraw" className="size-[25px] shrink-0 object-contain object-left drop-shadow-sm" />
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

export function EditorSidebar() {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="[&_[data-sidebar=sidebar]]:border-r-neutral-200/30 dark:[&_[data-sidebar=sidebar]]:border-r-white/10 [&_[data-sidebar=sidebar]]:bg-white dark:[&_[data-sidebar=sidebar]]:bg-[#050505] [&_[data-sidebar=sidebar]]:shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.04)] dark:[&_[data-sidebar=sidebar]]:shadow-none"
    >
      <SidebarBrand />
      <SidebarContent className="gap-0 pb-2 pt-2 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:gap-0">
        <EditorSidebarTools />
        <SidebarSeparator className="my-1" />
        <EditorSidebarText />
        <SidebarSeparator className="my-1" />
        <EditorSidebarAppearance />
        <SidebarSeparator className="my-1" />
        <EditorSidebarHistory />
      </SidebarContent>
      <EditorSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
