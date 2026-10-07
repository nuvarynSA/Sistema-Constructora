'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const router = useRouter()
  const dataClient = createClient()

  // Cargar email guardado al montar el componente
  useEffect(() => {
    const savedEmail = localStorage.getItem('nexora_email')
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('🔐 Intentando login con:', email)

    try {
      const { data, error: signInError } = await dataClient.auth.signInWithPassword({
        email,
        password,
      })

      console.log('📡 Respuesta de autenticación:', { data, error: signInError })

      if (signInError) {
        console.error('❌ Error de autenticación:', signInError)
        setError(`Error: ${signInError.message}`)
        setLoading(false)
        return
      }

      console.log('✅ Autenticación exitosa, buscando usuario en BD...')

      // Fetch user details from users table
      const { data: userRow, error: userError } = await dataClient
        .from('users')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('email', email)
        .single()

      console.log('📊 Datos del usuario:', { userData: userRow, error: userError })

      if (userError) {
        console.error('❌ Error al cargar usuario:', userError)
        setError(`Error al cargar usuario: ${userError.message}`)
        setLoading(false)
        return
      }

      const typedUserData = userRow as { status?: string; id?: string } | null
      if (!typedUserData) {
        console.error('❌ Usuario no encontrado en BD')
        setError('Usuario no encontrado en el sistema')
        setLoading(false)
        return
      }

      if (typedUserData.status !== 'Activo') {
        console.error('❌ Usuario inactivo')
        setError('Tu cuenta está inactiva. Contacta al administrador.')
        setLoading(false)
        await dataClient.auth.signOut()
        return
      }

      console.log('✅ Usuario encontrado, actualizando last_login...')

      // Guardar email si "Recordarme" está activo
      if (rememberMe) {
        localStorage.setItem('nexora_email', email)
      } else {
        localStorage.removeItem('nexora_email')
      }

      // Update last login
      await (dataClient
        .from('users') as any)
        .update({ last_login: new Date().toISOString() })
        .eq('id', (typedUserData.id || '') as string)

      console.log('🚀 Redirigiendo a dashboard...')
      
      // Esperar a que las cookies se establezcan
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Usar window.location para forzar recarga completa y establecer sesión
      window.location.href = '/dashboard/pedidos'
    } catch (err) {
      console.error('💥 Error inesperado:', err)
      setError(`Error inesperado: ${err instanceof Error ? err.message : 'Unknown'}`)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="pl-10 transition-all duration-200 focus:scale-[1.01]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="pl-10 pr-10 transition-all duration-200 focus:scale-[1.01]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="remember"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
          Recordar mi email
        </label>
      </div>

      <Button 
        type="submit" 
        className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Iniciando sesión...
          </>
        ) : (
          'Iniciar Sesión'
        )}
      </Button>
    </form>
  )
}
