import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Bell,
  ChevronsUpDown,
  Circle,
  Copy,
  Crop,
  Download,
  Grid3X3,
  Info,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
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
import { cn } from '../../lib/utils'
// import { Logo } from '../sidebar-02/logo'

const TOOLS = [
  { id: 'select', label: 'Select / Move', icon: MousePointer2, shortcut: 'V' },
  { id: 'rect', label: 'Rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, shortcut: 'E' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, shortcut: 'A' },
  { id: 'line', label: 'Line', icon: Minus, shortcut: 'L' },
  { id: 'text', label: 'Text', icon: Type, shortcut: 'T' },
  { id: 'pixelate', label: 'Pixelate', icon: Grid3X3, shortcut: '' },
  { id: 'magic-wand', label: 'Magic Wand', icon: Wand2, shortcut: 'M' },
] as const

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

const sidebarButtonClass =
  'h-8 rounded-md text-neutral-600 transition-all duration-200 hover:text-neutral-950 hover:scale-[1.03]'
const sidebarButtonInsetClass = 'px-2'
const sidebarIconClass = 'size-7 shrink-0 text-neutral-700'
const sidebarMenuClass = 'px-0'
const sidebarGroupLabelClass = 'pl-0 pr-2'

function getSidebarButtonStyle(isCollapsed: boolean): React.CSSProperties | undefined {
  return undefined
}

// Small reusable "keyboard key" chip. Sits close to the label instead of
// being pinned to the far edge of the sidebar, and has its own border/bg
// so it doesn't visually collide with the sidebar's outer border.
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center gap-1 rounded border border-neutral-200/60 bg-neutral-100/50 px-1.5 font-mono text-[10px] font-medium text-neutral-400 shadow-[0_1px_0_rgba(255,255,255,1)_inset]">
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
        'flex py-6 min-h-[52px]',
        isCollapsed
          ? 'flex-row items-center justify-center gap-y-4 md:flex-col md:items-center md:justify-center'
          : 'flex-row items-center justify-between pl-8 pr-5'
      )}
    >
      <a className="group flex min-w-0 items-center gap-2 outline-none" href="#">
        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white to-neutral-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-neutral-200/60 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] group-focus-visible:ring-2 group-focus-visible:ring-neutral-400 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-neutral-200/30 via-transparent to-neutral-200/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <img src="/inki.png" alt="Inki" className="relative z-10 size-5 object-contain drop-shadow-sm transition-transform duration-300" style={{ transform: 'scale(3)' }} />
        </div>
      </a>

      <motion.div
        animate={{ opacity: 1 }}
        className={cn('flex items-center gap-1.5', isCollapsed ? 'flex-row md:flex-col-reverse' : 'flex-row')}
        initial={{ opacity: 0 }}
        key={isCollapsed ? 'editor-header-collapsed' : 'editor-header-expanded'}
        transition={{ duration: 0.35 }}
      >
        <SidebarTrigger className="shrink-0 size-8 rounded-full border border-transparent bg-transparent text-neutral-500 transition-all duration-300 hover:scale-105 hover:bg-white hover:text-neutral-900 hover:border-neutral-200/80 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]" />
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
    <SidebarGroup className="mt-2 ml-1">
      <SidebarGroupLabel className={sidebarGroupLabelClass}>Tools</SidebarGroupLabel>
      <SidebarMenu className={sidebarMenuClass}>
        {TOOLS.map((tool) => (
          <SidebarMenuItem key={tool.id}>
            <SidebarMenuButton
              className={cn(
                sidebarButtonClass,
                activeTool === tool.id && 'scale-[1.08] text-neutral-950 font-semibold',
                isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass
              )}
              isActive={activeTool === tool.id}
              onClick={() => selectTool(tool.id)}
              style={getSidebarButtonStyle(isCollapsed)}
              tooltip={tool.label}
            >
              <tool.icon className={sidebarIconClass} />
              {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">{tool.label}</span>}
              {!isCollapsed && tool.shortcut && <ShortcutKey>{tool.shortcut}</ShortcutKey>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function EditorSidebarAppearance() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [activeColor, setActiveColor] = useState('#f97316')
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

      <div className={cn('py-2', isCollapsed ? 'flex flex-col items-center gap-1' : 'grid grid-cols-4 gap-2 px-2')}>
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
              'size-6 shrink-0 rounded-full border-2 transition-all duration-300 justify-self-center hover:scale-110 hover:shadow-md hover:border-transparent hover:ring-2 hover:ring-neutral-200/80',
              activeColor === color.value
                ? 'scale-110 border-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.1)] ring-2 ring-white'
                : 'border-transparent'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}

        {/* Custom color swatch opens the native color picker. */}
        <button
          onClick={() => customColorInputRef.current?.click()}
          title="Custom color"
          className={cn(
            'relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 justify-self-center hover:scale-110 hover:shadow-md hover:border-transparent hover:ring-2 hover:ring-neutral-200/80',
            customColor && activeColor === customColor
              ? 'scale-110 border-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.1)] ring-2 ring-white'
              : 'border-dashed border-neutral-300 hover:border-neutral-400'
          )}
          style={customColor ? { backgroundColor: customColor, borderStyle: 'solid' } : undefined}
        >
          {!customColor && <Plus className="size-3 text-neutral-400" />}
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

      {!isCollapsed && <div className="pl-6 pr-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-normal text-neutral-400">Stroke</div>}
      <div className={cn('flex pr-1', isCollapsed ? 'flex-col items-center pt-1 gap-1 px-0' : 'flex-col gap-1 pl-6')}>
        {STROKES.map((stroke) => (
          <button
            key={stroke.value}
            onClick={() => selectStroke(stroke.value)}
            title={stroke.label}
            className={cn(
              'flex h-8 w-full items-center rounded-md transition-all duration-200 hover:text-neutral-950 hover:scale-[1.03]',
              'justify-center',
              activeStroke === stroke.value ? 'scale-[1.08] text-neutral-950 font-semibold' : 'text-neutral-500'
            )}
          >
            <span className="rounded-full bg-current" style={{ width: !isCollapsed ? '28px' : '14px', height: stroke.height }} />
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
            className={cn(sidebarButtonClass, isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass)}
            onClick={() => w.editorUndo?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Undo"
          >
            <Undo2 className={sidebarIconClass} />
            {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">Undo</span>}
            {!isCollapsed && <ShortcutKey>Ctrl Z</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass)}
            onClick={() => w.editorRedo?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Redo"
          >
            <Redo2 className={sidebarIconClass} />
            {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">Redo</span>}
            {!isCollapsed && <ShortcutKey>Ctrl Shift Z</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass)}
            onClick={() => w.editorClear?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Clear canvas"
          >
            <Trash2 className={sidebarIconClass} />
            {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">Clear Canvas</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function EditorSidebarExport() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const w = window as any

  return (
    <SidebarGroup>
      <SidebarGroupLabel className={sidebarGroupLabelClass}>Export</SidebarGroupLabel>
      <SidebarMenu className={sidebarMenuClass}>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass)}
            onClick={() => w.editorCrop?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Crop image"
          >
            <Crop className={sidebarIconClass} />
            {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">Crop</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass)}
            onClick={() => w.editorCopy?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Copy to clipboard"
          >
            <Copy className={sidebarIconClass} />
            {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">Copy</span>}
            {!isCollapsed && <ShortcutKey>Ctrl C</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed ? 'justify-center px-0' : sidebarButtonInsetClass)}
            onClick={() => w.editorSave?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Save as PNG"
          >
            <Download className={sidebarIconClass} />
            {!isCollapsed && <span className="ml-2 flex-1 truncate text-sm font-medium">Save PNG</span>}
            {!isCollapsed && <ShortcutKey>Ctrl E</ShortcutKey>}
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
    <SidebarFooter className="px-2">
      <button
        onClick={() => window.open('https://github.com/prathm-k/inki', '_blank')}
        className={cn(
          'group flex h-12 w-full items-center gap-3 rounded-md px-2 text-left text-neutral-950 transition-all duration-200 hover:scale-[1.02]',
          isCollapsed && 'justify-center px-0'
        )}
        title="Shortcuts & Info"
        type="button"
      >
        <span className="ml-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
          <Info className="size-4" />
        </span>
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold leading-4 text-black">Inki</span>
              <span className="block truncate text-[11px] font-medium leading-3 text-neutral-500">Free</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-500">
              <span>v0.1.0</span>
              <ChevronsUpDown className="size-3" />
            </span>
          </>
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
      className="translate-x-1 shadow-[20px_0_40px_rgba(15,23,42,0.06),_1px_0_4px_rgba(15,23,42,0.02)] [&_[data-sidebar=sidebar]]:border-r-neutral-200/50 [&_[data-sidebar=sidebar]]:bg-white/90 [&_[data-sidebar=sidebar]]:backdrop-blur-xl [&_[data-sidebar=sidebar]]:shadow-[inset_-1px_0_0_rgba(255,255,255,1)]"
    >
      <SidebarBrand />
      <SidebarContent className="gap-6 pl-8 pr-5 pb-6 pt-10">
        <EditorSidebarTools />
        <SidebarSeparator className="mx-2" />
        <EditorSidebarAppearance />
        <SidebarSeparator className="mx-2" />
        <EditorSidebarHistory />
        <SidebarSeparator className="mx-2" />
        <EditorSidebarExport />
      </SidebarContent>
      <EditorSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
