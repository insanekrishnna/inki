import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/sidebar-02/app-sidebar';

export default function Sidebar02() {
  return (
    <SidebarProvider>
      <div className="relative flex h-dvh w-full">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col" />
      </div>
    </SidebarProvider>
  );
}
