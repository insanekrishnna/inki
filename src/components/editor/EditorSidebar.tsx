import React from 'react'
import { Sidebar, SidebarContent, SidebarSeparator, SidebarRail } from '../ui/sidebar'
import { EditorSidebarHeader } from './EditorSidebarHeader'
import { EditorSidebarTools } from './EditorSidebarTools'
import { EditorSidebarAppearance } from './EditorSidebarAppearance'
import { EditorSidebarHistory } from './EditorSidebarHistory'
import { EditorSidebarExport } from './EditorSidebarExport'
import { EditorSidebarFooter } from './EditorSidebarFooter'

export function EditorSidebar() {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <EditorSidebarHeader />
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
