import React from 'react'
import { Crop, Monitor, Camera } from 'lucide-react'
import { SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from '../ui/sidebar'
import { cn } from '../../lib/utils'

export function EditorSidebarHeader() {
  const { open } = useSidebar()

  const triggerCapture = (mode: string) => {
    const w = window as any
    if (mode === 'region' && typeof w.startCaptureRegion === 'function') w.startCaptureRegion()
    else if (mode === 'window' && typeof w.startCaptureWindow === 'function') w.startCaptureWindow()
    else if (mode === 'fullscreen' && typeof w.startCaptureFullscreen === 'function') w.startCaptureFullscreen()
  }

  return (
    <SidebarHeader>
      <div className="flex items-center justify-end">
        <SidebarTrigger />
      </div>
    </SidebarHeader>
  )
}
