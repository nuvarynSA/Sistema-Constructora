'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu, Package, FileText, Building2, BarChart3, Users, Truck } from 'lucide-react'
import type { User } from '@/lib/types'
import { isAdminRoleName } from '@/lib/permissions'

interface MobileNavProps {
  user: User | null
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isLogisticaOnly = user?.role?.name === 'Logística'
  const navItems = [
    { icon: Package, label: 'Pedidos', path: '/dashboard/pedidos' },
    ...(isLogisticaOnly
      ? []
      : [
          { icon: FileText, label: 'Licitaciones', path: '/dashboard/licitaciones' },
          { icon: Building2, label: 'Obras', path: '/dashboard/obras' },
          { icon: BarChart3, label: 'Reportes', path: '/dashboard/reportes' },
        ]),
    { icon: Truck, label: 'Logística', path: '/dashboard/logistica/tareas' },
  ]

  if (isAdminRoleName(user?.role?.name)) {
    navItems.push({ icon: Users, label: 'Usuarios', path: '/dashboard/usuarios' })
  }

  const handleNavigate = (path: string) => {
    router.push(path)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            NEXORA
          </SheetTitle>
        </SheetHeader>
        
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname?.includes(item.path.split('/').pop() || '')
            
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start gap-3 h-12 transition-all hover:scale-105 active:scale-95"
                onClick={() => handleNavigate(item.path)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-base">{item.label}</span>
              </Button>
            )
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.role?.name}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
