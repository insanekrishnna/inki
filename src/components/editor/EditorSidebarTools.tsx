import React, { useEffect, useState } from 'react'
import { MousePointer2, Square, Circle, ArrowUpRight, Minus, Type, Grid3X3, Wand2, Droplets, ListOrdered } from 'lucide-react'
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '../ui/sidebar'

const TOOLS = [
  { id: 'select', label: 'Select / Move', icon: MousePointer2, shortcut: 'V' },
  { id: 'rect', label: 'Rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, shortcut: 'E' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, shortcut: 'A' },
  { id: 'line', label: 'Line', icon: Minus, shortcut: 'L' },
  { id: 'text', label: 'Text', icon: Type, shortcut: 'T' },
  { id: 'badge', label: 'Number Badge', icon: ListOrdered, shortcut: 'N' },
  { id: 'pixelate', label: 'Pixelate', icon: Grid3X3, shortcut: '' },
  { id: 'blur', label: 'Blur', icon: Droplets, shortcut: '' }
] as const

export function EditorSidebarTools() {
  const { open } = useSidebar()
  const [activeTool, setActiveTool] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.currentTool !== undefined) {
        setActiveTool(detail.currentTool)
      }
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
            <SidebarMenuButton
              isActive={activeTool === tool.id}
              onClick={() => selectTool(tool.id)}
              tooltip={tool.label}
            >
              <tool.icon size={16} />
              {open && (
                <>
                  <span className="flex-1 truncate">{tool.label}</span>
                  {tool.shortcut && (
                    <kbd className="ml-auto text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">
                      {tool.shortcut}
                    </kbd>
                  )}
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
