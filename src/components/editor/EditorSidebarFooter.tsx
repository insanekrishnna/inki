import React from 'react'
import { Info } from 'lucide-react'
import { SidebarFooter as SidebarFooterPrimitive, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar'

export function EditorSidebarFooter() {
  return (
    <SidebarFooterPrimitive>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => window.open('https://github.com/prathm-k/inki', '_blank')} tooltip="Shortcuts & Info">
            <Info size={16} />
            <span>Shortcuts & Info</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooterPrimitive>
  )
}
