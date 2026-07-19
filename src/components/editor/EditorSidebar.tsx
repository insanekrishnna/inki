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
  { id: 'crop', label: 'Crop', icon: Crop, shortcut: '' },
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
  'h-9 rounded-lg text-neutral-500 transition-all duration-150 hover:bg-neutral-50 hover:text-neutral-900'
const sidebarButtonInsetClass = 'px-3'
const sidebarIconClass = 'size-[18px] shrink-0 text-neutral-400'
const sidebarMenuClass = 'gap-0.5'
const sidebarGroupLabelClass = 'px-0'

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
      className="inline-flex items-center justify-center font-mono text-neutral-400/70 shrink-0"
      style={{
        height: 18,
        minWidth: 18,
        paddingLeft: 5,
        paddingRight: 5,
        marginRight: 2,
        fontSize: 10,
        lineHeight: 1,
        borderRadius: 4,
        border: '1px solid rgba(0,0,0,0.06)',
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
        'flex min-h-[56px] border-b border-neutral-100/80',
        isCollapsed
          ? 'flex-col items-center justify-start gap-y-0 py-3'
          : 'flex-row items-center justify-between py-3'
      )}
      style={{ paddingLeft: 4, paddingRight: 16 }}
    >
      <a className="group flex min-w-0 items-center gap-2.5 outline-none" href="#">
        <img src="/inki.png" alt="Inki" className="size-16 shrink-0 object-contain object-left drop-shadow-sm transition-transform duration-200 group-hover:scale-105" />
      </a>

      <motion.div
        animate={{ opacity: 1 }}
        className={cn('flex items-center', isCollapsed ? 'flex-row md:flex-col-reverse' : 'flex-row')}
        initial={{ opacity: 0 }}
        key={isCollapsed ? 'editor-header-collapsed' : 'editor-header-expanded'}
        transition={{ duration: 0.25 }}
      >
        <SidebarTrigger className="shrink-0 size-7 rounded-md border border-transparent bg-transparent text-neutral-400 transition-all duration-150 hover:bg-neutral-50 hover:text-neutral-700" />
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
                activeTool === tool.id && 'bg-neutral-100/80 text-neutral-900 font-semibold',
                isCollapsed && 'justify-center px-0'
              )}
              isActive={activeTool === tool.id}
              onClick={() => selectTool(tool.id)}
              style={getSidebarButtonStyle(isCollapsed)}
              tooltip={tool.label}
            >
              <tool.icon className={cn(sidebarIconClass, activeTool === tool.id && 'text-neutral-700')} />
              {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium">{tool.label}</span>}
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

      <div
        className={cn(isCollapsed ? 'flex flex-col items-center gap-1.5' : 'flex flex-wrap gap-2')}
        style={{ paddingTop: 10, paddingBottom: 16, paddingLeft: 20, paddingRight: 16 }}
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
              'size-[22px] shrink-0 rounded-full border-[1.5px] transition-all duration-150 hover:scale-110 hover:shadow-sm',
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
            'relative flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 hover:scale-110',
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
          className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-400/80"
          style={{ paddingTop: 18, paddingBottom: 8, paddingLeft: 20 }}
        >
          Stroke
        </div>
      )}
      <div
        className={cn('flex', isCollapsed ? 'flex-col items-center pt-1 gap-0.5 px-0' : 'flex-col gap-0.5')}
        style={isCollapsed ? undefined : { paddingLeft: 20, paddingRight: 16 }}
      >
        {STROKES.map((stroke) => (
          <button
            key={stroke.value}
            onClick={() => selectStroke(stroke.value)}
            title={stroke.label}
            className={cn(
              'flex h-8 w-full items-center rounded-lg transition-all duration-150 hover:bg-neutral-50',
              'justify-center',
              activeStroke === stroke.value ? 'bg-neutral-100/80 text-neutral-900' : 'text-neutral-400'
            )}
          >
            <span className="rounded-full bg-current" style={{ width: !isCollapsed ? '24px' : '14px', height: stroke.height }} />
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
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium">Undo</span>}
            {!isCollapsed && <ShortcutKey>Ctrl Z</ShortcutKey>}
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
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium">Redo</span>}
            {!isCollapsed && <ShortcutKey>Ctrl Shift Z</ShortcutKey>}
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
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium">Clear Canvas</span>}
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
            className={cn(sidebarButtonClass, isCollapsed && 'justify-center px-0')}
            onClick={() => w.editorCopy?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Copy to clipboard"
          >
            <Copy className={sidebarIconClass} />
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium">Copy</span>}
            {!isCollapsed && <ShortcutKey>Ctrl C</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={cn(sidebarButtonClass, isCollapsed && 'justify-center px-0')}
            onClick={() => w.editorSave?.()}
            style={getSidebarButtonStyle(isCollapsed)}
            tooltip="Save as PNG"
          >
            <Download className={sidebarIconClass} />
            {!isCollapsed && <span className="flex-1 truncate text-[13px] font-medium">Save PNG</span>}
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
    <SidebarFooter className="border-t border-neutral-100/80" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <button
        onClick={() => window.open('https://github.com/prathm-k/inki', '_blank')}
        className={cn(
          'group flex h-14 w-full items-center gap-0 rounded-lg text-left transition-all duration-150 hover:bg-neutral-50',
          isCollapsed ? 'justify-center px-0' : ''
        )}
        style={isCollapsed ? undefined : { paddingLeft: 0, paddingRight: 16 }}
        title="Shortcuts & Info"
        type="button"
      >
        {!isCollapsed && (
          <>
            <img src="/inki.png" alt="Inki" className="size-[62px] shrink-0 object-contain object-left drop-shadow-sm -ml-5 -mr-5" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-5 text-neutral-900">Inki</span>
              <span className="block truncate text-[11px] font-normal leading-4 text-neutral-400">Free</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-normal text-neutral-400">
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
      className="[&_[data-sidebar=sidebar]]:border-r-neutral-200/30 [&_[data-sidebar=sidebar]]:bg-white [&_[data-sidebar=sidebar]]:shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.04)]"
    >
      <SidebarBrand />
      <SidebarContent className="gap-0 pb-4 pt-4 group-data-[collapsible=icon]:pt-3 group-data-[collapsible=icon]:gap-1">
        <EditorSidebarTools />
        <SidebarSeparator className="my-2" />
        <EditorSidebarAppearance />
        <SidebarSeparator className="my-2" />
        <EditorSidebarHistory />
        <SidebarSeparator className="my-2" />
        <EditorSidebarExport />
      </SidebarContent>
      <EditorSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
