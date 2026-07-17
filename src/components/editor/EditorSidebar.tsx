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
import { Logo } from '../sidebar-02/logo'

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
  'h-9 rounded-xl text-neutral-600 transition-all hover:bg-white/90 hover:text-neutral-950 hover:shadow-sm'
const sidebarButtonInsetClass = 'pl-3 pr-3'
const sidebarIconClass = 'size-4 shrink-0 text-neutral-700'
const sidebarMenuClass = 'gap-1 pl-4 pr-1'
const sidebarGroupLabelClass = 'pl-4 pr-2'

function getSidebarButtonStyle(isCollapsed: boolean): React.CSSProperties | undefined {
  if (isCollapsed) return undefined
  return {
    paddingLeft: 10,
    paddingRight: 12,
  }
}

// Small reusable "keyboard key" chip. Sits close to the label instead of
// being pinned to the far edge of the sidebar, and has its own border/bg
// so it doesn't visually collide with the sidebar's outer border.
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className=" px-1.5 py-0.5 text-[10px] font-medium ">
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
        'flex md:pt-3.5',
        isCollapsed
          ? 'flex-row items-center justify-between gap-y-4 px-4 md:flex-col md:items-start md:justify-start'
          : 'flex-row items-center justify-between px-3'
      )}
    >
      <a className="flex min-w-0 items-center gap-2" href="#">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200">
          <Logo className="size-5" />
        </span>
        {!isCollapsed && <span className="truncate text-[15px] font-semibold text-black">Inki</span>}
      </a>

      <motion.div
        animate={{ opacity: 1 }}
        className={cn('flex items-center gap-1.5', isCollapsed ? 'flex-row md:flex-col-reverse' : 'flex-row')}
        initial={{ opacity: 0 }}
        key={isCollapsed ? 'editor-header-collapsed' : 'editor-header-expanded'}
        transition={{ duration: 0.35 }}
      >
        <button
          aria-label="Notifications"
          className="inline-flex size-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
          type="button"
        >
          <Bell className="size-4" />
        </button>
        <SidebarTrigger className="shrink-0" />
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
                activeTool === tool.id && 'bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200/70',
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
      <SidebarGroupLabel className="px-2">Appearance</SidebarGroupLabel>

      <div className={cn('flex flex-wrap items-center gap-2 px-2 py-2', isCollapsed ? 'flex-col justify-center px-0 gap-3' : '')}>
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
              'size-6 shrink-0 rounded-full border-2 transition-all',
              activeColor === color.value
                ? 'border-neutral-950 shadow-sm ring-2 ring-white'
                : 'border-transparent hover:scale-105 hover:ring-2 hover:ring-neutral-200'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}

        {/* Custom color swatch opens the native color picker. */}
        <button
          onClick={() => customColorInputRef.current?.click()}
          title="Custom color"
          className={cn(
            'relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
            customColor && activeColor === customColor
              ? 'border-neutral-950 shadow-sm ring-2 ring-white'
              : 'border-dashed border-neutral-300 hover:scale-105 hover:border-neutral-400'
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

      {!isCollapsed && <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-normal text-neutral-400">Stroke</div>}
      <div className={cn('flex px-1', isCollapsed ? 'flex-col items-center px-0 pt-2 gap-3' : 'flex-col gap-1')}>
        {STROKES.map((stroke) => (
          <button
            key={stroke.value}
            onClick={() => selectStroke(stroke.value)}
            title={stroke.label}
            className={cn(
              'flex h-8 w-full items-center justify-center rounded-lg transition-colors',
              activeStroke === stroke.value ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950'
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
          'flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left text-neutral-950 transition-colors hover:bg-neutral-100',
          isCollapsed && 'justify-center px-0'
        )}
        title="Shortcuts & Info"
        type="button"
      >
        <span className="ml-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200">
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
      className="translate-x-1 shadow-[12px_0_32px_rgba(15,23,42,0.06)] [&_[data-sidebar=sidebar]]:border-r-neutral-200/80 [&_[data-sidebar=sidebar]]:bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f8_48%,#f2f2f2_100%)] [&_[data-sidebar=sidebar]]:shadow-[inset_-1px_0_0_rgba(255,255,255,0.75)]"
    >
      <SidebarBrand />
      <SidebarContent className="gap-4 px-3 py-4">
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
