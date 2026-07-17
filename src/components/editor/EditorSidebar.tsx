import React, { useEffect, useRef, useState } from 'react'
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
  PanelLeft,
  Plus,
  Redo2,
  Square,
  Sun,
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

// Small reusable "keyboard key" chip. Sits close to the label instead of
// being pinned to the far edge of the sidebar, and has its own border/bg
// so it doesn't visually collide with the sidebar's outer border.
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-3 shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-neutral-400">
      {children}
    </kbd>
  )
}

function SidebarBrand() {
  const { open } = useSidebar()

  return (
    <SidebarHeader>
      <div className="flex h-8 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center text-neutral-950">
          <Sun className="size-7 fill-neutral-950 stroke-[2.5]" />
        </div>
        {open && <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-black">Inki</div>}
        <SidebarTrigger className={cn(!open && 'ml-auto')} />
      </div>
    </SidebarHeader>
  )
}

function EditorSidebarTools() {
  const { open } = useSidebar()
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
      <SidebarGroupLabel>Tools</SidebarGroupLabel>
      <SidebarMenu>
        {TOOLS.map((tool) => (
          <SidebarMenuItem key={tool.id}>
            <SidebarMenuButton isActive={activeTool === tool.id} onClick={() => selectTool(tool.id)} tooltip={tool.label}>
              <tool.icon />
              {open && <span>{tool.label}</span>}
              {open && tool.shortcut && <ShortcutKey>{tool.shortcut}</ShortcutKey>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function EditorSidebarAppearance() {
  const { open } = useSidebar()
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
      <SidebarGroupLabel>Appearance</SidebarGroupLabel>

      <div className={cn('flex flex-wrap items-center gap-2 px-1 py-2', !open && 'justify-center px-0')}>
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => selectColor(color.value)}
            title={color.label}
            className={cn(
              'size-6 shrink-0 rounded-full border-2 transition-all',
              activeColor === color.value ? 'border-neutral-950 shadow-sm ring-2 ring-white' : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}

        {/* Custom color swatch — opens the native color picker */}
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

      {open && <div className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Stroke</div>}
      <div className={cn('flex flex-col gap-1 px-1', !open && 'items-center px-0 pt-2')}>
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
            <span className="rounded-full bg-current" style={{ width: open ? '28px' : '14px', height: stroke.height }} />
          </button>
        ))}
      </div>
    </SidebarGroup>
  )
}

function EditorSidebarHistory() {
  const { open } = useSidebar()
  const w = window as any

  return (
    <SidebarGroup>
      <SidebarGroupLabel>History</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorUndo?.()} tooltip="Undo">
            <Undo2 />
            {open && <span>Undo</span>}
            {open && <ShortcutKey>Ctrl Z</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorRedo?.()} tooltip="Redo">
            <Redo2 />
            {open && <span>Redo</span>}
            {open && <ShortcutKey>Ctrl Shift Z</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorClear?.()} tooltip="Clear canvas">
            <Trash2 />
            {open && <span>Clear Canvas</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function EditorSidebarExport() {
  const { open } = useSidebar()
  const w = window as any

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Export</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorCrop?.()} tooltip="Crop image">
            <Crop />
            {open && <span>Crop</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorCopy?.()} tooltip="Copy to clipboard">
            <Copy />
            {open && <span>Copy</span>}
            {open && <ShortcutKey>Ctrl C</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorSave?.()} tooltip="Save as PNG">
            <Download />
            {open && <span>Save PNG</span>}
            {open && <ShortcutKey>Ctrl E</ShortcutKey>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function EditorSidebarFooter() {
  const { open } = useSidebar()

  return (
    <SidebarFooter>
      <button
        onClick={() => window.open('https://github.com/prathm-k/inki', '_blank')}
        className={cn(
          'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-neutral-950 hover:bg-neutral-100',
          !open && 'justify-center'
        )}
        title="Shortcuts & Info"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-100">
          <Info className="size-4" />
        </span>
        {open && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold leading-4 text-black">Alpha Inc.</span>
              <span className="block truncate text-[11px] font-medium leading-3 text-neutral-500">Free</span>
            </span>
            <ChevronsUpDown className="size-[13px] shrink-0 text-neutral-950" />
          </>
        )}
      </button>
    </SidebarFooter>
  )
}

export function EditorSidebar() {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarBrand />
      <SidebarContent>
        <EditorSidebarTools />
        <SidebarSeparator />
        <EditorSidebarAppearance />
        <SidebarSeparator />
        <EditorSidebarHistory />
        <SidebarSeparator />
        <EditorSidebarExport />
      </SidebarContent>
      <EditorSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}