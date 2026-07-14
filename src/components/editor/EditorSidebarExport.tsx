import React from 'react'
import { Crop, Copy, Download } from 'lucide-react'
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '../ui/sidebar'

export function EditorSidebarExport() {
  const { open } = useSidebar()
  const w = window as any

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Export</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorCrop?.()} tooltip="Crop image">
            <Crop size={16} />
            {open && <span>Crop</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorCopy?.()} tooltip="Copy to clipboard">
            <Copy size={16} />
            {open && (
              <>
                <span className="flex-1">Copy</span>
                <kbd className="ml-auto text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">⌘C</kbd>
              </>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => w.editorSave?.()} tooltip="Save as PNG">
            <Download size={16} />
            {open && (
              <>
                <span className="flex-1">Save PNG</span>
                <kbd className="ml-auto text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">⌘E</kbd>
              </>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
