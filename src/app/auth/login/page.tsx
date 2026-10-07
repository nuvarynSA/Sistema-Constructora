import { Login } from '@/components/auth/login'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20 p-4 animate-in fade-in duration-500">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-900/[0.04] dark:bg-grid-gray-100/[0.02] -z-10" />
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-2 animate-in zoom-in-95 duration-500">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
              <CardTitle className="relative text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                NEXORA
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-base text-muted-foreground">
            Sistema de Gestión de Pedidos y Licitaciones
          </CardDescription>
          <div className="h-1 w-20 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" />
        </CardHeader>
        <CardContent className="pb-8">
          <Login />
        </CardContent>
      </Card>
    </div>
  )
}

