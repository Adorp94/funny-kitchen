'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb'
import { Loader2 } from 'lucide-react'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, mounted } = useAuth()
  const pathname = usePathname()

  // Routes that don't require authentication and shouldn't show the sidebar
  const publicRoutes = ['/login', '/reset-password', '/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Prevent hydration mismatch by not rendering loading state on server
  // Show loading spinner while checking authentication, but only after mounted
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Cargando...</span>
        </div>
      </div>
    )
  }

  // If it's a public route or user is not authenticated, show content without sidebar
  if (isPublicRoute || !user) {
    return <>{children}</>
  }

  // If user is authenticated and it's not a public route, show app layout with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
            <div className="p-6 space-y-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}