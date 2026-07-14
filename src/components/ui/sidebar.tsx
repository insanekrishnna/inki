import * as React from "react"
import { cn } from "../../lib/utils"

// ─── Context ─────────────────────────────────────────────────
type SidebarContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
  toggle: () => {},
  isMobile: false,
})

export function useSidebar() {
  return React.useContext(SidebarContext)
}

// ─── Provider ────────────────────────────────────────────────
interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
}

export function SidebarProvider({
  defaultOpen = true,
  className,
  children,
  ...props
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
      if (e.matches) setOpen(false)
    }
    handler(mq)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const toggle = React.useCallback(() => setOpen((v) => !v), [])

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle, isMobile }}>
      <div
        className={cn("flex min-h-screen w-full", className)}
        data-sidebar-open={open}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right"
}

export function Sidebar({
  side = "left",
  className,
  children,
  ...props
}: SidebarProps) {
  const { open, isMobile, setOpen } = useSidebar()

  if (isMobile) {
    return (
      <>
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed top-0 z-50 flex h-[calc(100vh-1.5rem)] w-64 flex-col bg-white dark:bg-[#1e1f24] text-black dark:text-white border border-black/10 dark:border-[rgba(255,255,255,0.12)] rounded-[10px] my-3 ml-3 p-1.5 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-300 ease-in-out overflow-hidden",
            side === "left" ? "left-0" : "right-0",
            open
              ? "translate-x-0"
              : side === "left"
                ? "-translate-x-[120%]"
                : "translate-x-[120%]",
            className
          )}
          {...props}
        >
          {children}
        </aside>
      </>
    )
  }

  return (
    <aside
      className={cn(
        "flex flex-col border border-black/10 dark:border-[rgba(255,255,255,0.12)] bg-white dark:bg-[#1e1f24] text-black dark:text-white transition-all duration-300 ease-in-out overflow-hidden shrink-0",
        "rounded-[10px] my-3 ml-3 h-[calc(100vh-1.5rem)] p-1.5 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
        open ? "w-56" : "w-14",
        className
      )}
      data-state={open ? "expanded" : "collapsed"}
      {...props}
    >
      {children}
    </aside>
  )
}

// ─── SidebarInset (main content area) ────────────────────────
export function SidebarInset({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={cn("flex flex-1 flex-col overflow-hidden", className)}
      {...props}
    >
      {children}
    </main>
  )
}

// ─── SidebarHeader ───────────────────────────────────────────
export function SidebarHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-1.5 border-b border-black/10 dark:border-[rgba(255,255,255,0.12)]", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── SidebarContent ──────────────────────────────────────────
export function SidebarContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto overflow-x-hidden p-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── SidebarFooter ───────────────────────────────────────────
export function SidebarFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-1.5 border-t border-black/10 dark:border-[rgba(255,255,255,0.12)] mt-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── SidebarGroup ────────────────────────────────────────────
export function SidebarGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 py-2", className)} {...props}>
      {children}
    </div>
  )
}

// ─── SidebarGroupLabel ───────────────────────────────────────
export function SidebarGroupLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar()
  return (
    <div
      className={cn(
        "px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 truncate transition-opacity",
        !open && "opacity-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── SidebarMenu ─────────────────────────────────────────────
export function SidebarMenu({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("flex flex-col gap-0.5", className)} {...props}>
      {children}
    </ul>
  )
}

// ─── SidebarMenuItem ─────────────────────────────────────────
export function SidebarMenuItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("list-none", className)} {...props}>
      {children}
    </li>
  )
}

// ─── SidebarMenuButton ───────────────────────────────────────
interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  tooltip?: string
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, isActive, tooltip, children, ...props }, ref) => {
  const { open } = useSidebar()

  return (
    <button
      ref={ref}
      type="button"
      data-active={isActive || undefined}
      title={!open ? tooltip : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] font-medium outline-none transition-all duration-100 ease-out",
        "text-black/80 dark:text-[rgba(255,255,255,0.8)] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-[rgba(255,255,255,0.08)]",
        "focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
        isActive && "bg-black/5 dark:bg-[rgba(255,255,255,0.08)] text-black dark:text-white font-semibold",
        !open && "justify-center px-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

// ─── SidebarSeparator ────────────────────────────────────────
export function SidebarSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-2 my-1 h-px bg-black/10 dark:bg-[rgba(255,255,255,0.12)]", className)}
      {...props}
    />
  )
}

// ─── SidebarTrigger ──────────────────────────────────────────
export function SidebarTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle, open } = useSidebar()

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors",
        className
      )}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      {...props}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("transition-transform", !open && "rotate-180")}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="M14 9l-3 3 3 3" />
      </svg>
    </button>
  )
}
