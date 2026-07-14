import React from 'react'
import { Undo2, Redo2, Trash2 } from 'lucide-react'
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '../ui/sidebar'

export function EditorSidebarHistory() {
  const { open } = useSidebar()
  const w = window as any

  return (
    <SidebarGroup>
      <SidebarGroupLabel>History</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorUndo?.()} tooltip="Undo">
            <Undo2 size={16} />
            {open && (
              <>
                <span className="flex-1">Undo</span>
                <kbd className="ml-auto text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">⌘Z</kbd>
              </>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorRedo?.()} tooltip="Redo">
            <Redo2 size={16} />
            {open && (
              <>
                <span className="flex-1">Redo</span>
                <kbd className="ml-auto text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">⌘⇧Z</kbd>
              </>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorClear?.()} tooltip="Clear canvas">
            <Trash2 size={16} />
            {open && <span>Clear Canvas</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
