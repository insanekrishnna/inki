import React, { useEffect, useState } from 'react'
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

function SidebarBrand() {
  const { open } = useSidebar()

  return (
    <SidebarHeader>
      <div className="flex items-center gap-[10px]">
        <div className="flex size-7 shrink-0 items-center justify-center text-neutral-950">
          <Sun className="size-[26px] fill-neutral-950 stroke-[2.5]" />
        </div>
        {open && <div className="min-w-0 flex-1 truncate text-[12px] font-semibold text-black">Acme</div>}
        {open && (
          <div className="flex items-center gap-[12px] text-neutral-950">
            <button className="inline-flex size-5 items-center justify-center rounded-md hover:bg-neutral-100" title="Notifications">
              <Bell className="size-[13px]" />
            </button>
            <SidebarTrigger>
              <PanelLeft className="size-[13px]" />
            </SidebarTrigger>
          </div>
        )}
        {!open && <SidebarTrigger className="ml-auto" />}
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
              {open && tool.shortcut && <kbd className="ml-auto text-[10px] font-medium text-neutral-400">{tool.shortcut}</kbd>}
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
      <div className={cn('flex flex-wrap gap-1.5 px-0 py-1.5', !open && 'justify-center')}>
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => selectColor(color.value)}
            title={color.label}
            className={cn(
              'size-5 shrink-0 rounded-full border-2 transition-all',
              activeColor === color.value ? 'border-neutral-950 shadow-sm ring-2 ring-white' : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>
      {open && <div className="px-0 pb-1 pt-2 text-[10px] font-medium uppercase text-neutral-400">Stroke</div>}
      <div className={cn('flex flex-col gap-1 px-0', !open && 'items-center pt-2')}>
        {STROKES.map((stroke) => (
          <button
            key={stroke.value}
            onClick={() => selectStroke(stroke.value)}
            title={stroke.label}
            className={cn(
              'flex h-7 w-full items-center justify-center rounded-md transition-colors',
              activeStroke === stroke.value ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950'
            )}
          >
            <span className="rounded-full bg-current" style={{ width: open ? '24px' : '14px', height: stroke.height }} />
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
            {open && <kbd className="ml-auto text-[10px] font-medium text-neutral-400">Ctrl Z</kbd>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorRedo?.()} tooltip="Redo">
            <Redo2 />
            {open && <span>Redo</span>}
            {open && <kbd className="ml-auto text-[10px] font-medium text-neutral-400">Ctrl Shift Z</kbd>}
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
            {open && <kbd className="ml-auto text-[10px] font-medium text-neutral-400">Ctrl C</kbd>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorSave?.()} tooltip="Save as PNG">
            <Download />
            {open && <span>Save PNG</span>}
            {open && <kbd className="ml-auto text-[10px] font-medium text-neutral-400">Ctrl E</kbd>}
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
          'flex h-[44px] w-full items-center gap-[10px] rounded-lg px-0 text-left text-neutral-950 hover:bg-neutral-100',
          !open && 'justify-center'
        )}
        title="Shortcuts & Info"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-100">
          <Info className="size-[13px]" />
        </span>
        {open && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold leading-3 text-black">Alpha Inc.</span>
              <span className="block truncate text-[10px] font-medium leading-3 text-neutral-500">Free</span>
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
        <EditorSidebarAppearance />
        <EditorSidebarHistory />
        <EditorSidebarExport />
      </SidebarContent>
      <EditorSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
