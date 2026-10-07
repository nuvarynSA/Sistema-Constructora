'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/mock/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatDateTime, formatMoney, getPriorityColor, getStatusColor } from '@/lib/utils'
import { Calendar, MapPin, Building2, User, FileText, Clock, MessageSquare, DollarSign, Upload, X, Eye, Download, Loader2, ChevronDown, AtSign, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Licitacion, Comment, LicitacionHistory, Document } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { logLicitacionAction } from '@/lib/audit'

interface LicitacionDetailDialogProps {
  licitacion: Licitacion
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function LicitacionDetailDialog({ licitacion, open, onOpenChange, onUpdate }: LicitacionDetailDialogProps) {
  const { toast } = useToast()
  const dataClient = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<LicitacionHistory[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [itemFiles, setItemFiles] = useState<File[]>([])
  const [uploadingItemFiles, setUploadingItemFiles] = useState(false)
  const [itemDocuments, setItemDocuments] = useState<Document[]>([])
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [uploadingCommentFiles, setUploadingCommentFiles] = useState(false)
  const [commentDocuments, setCommentDocuments] = useState<Document[]>([])
  const [mentionUsers, setMentionUsers] = useState<{ id: string; name: string; area: string }[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionList, setShowMentionList] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [montoDraft, setMontoDraft] = useState('')
  const [savingMonto, setSavingMonto] = useState(false)
  const { canDeleteLicitacion, getPermissionErrorMessage, userData, isAdmin } = usePermissions()

  const fetchComments = useCallback(async () => {
    const { data } = await dataClient
      .from('comments')
      .select('*, user:users(*)')
      .eq('licitacion_id', licitacion.id)
      .order('created_at', { ascending: false })

    setComments(data || [])
  }, [dataClient, licitacion.id])

  const fetchHistory = useCallback(async () => {
    const { data } = await dataClient
      .from('licitacion_histories')
      .select('*, usuario:users(*)')
      .eq('licitacion_id', licitacion.id)
      .order('created_at', { ascending: false })

    setHistory(data || [])
  }, [dataClient, licitacion.id])

  const fetchItemDocuments = useCallback(async () => {
    const { data } = await dataClient
      .from('documents')
      .select('*')
      .eq('licitacion_id', licitacion.id)
      .neq('tipo', 'Comentario')
      .order('created_at', { ascending: false })

    setItemDocuments(data || [])
  }, [dataClient, licitacion.id])

  const fetchCommentDocuments = useCallback(async () => {
    const { data } = await dataClient
      .from('documents')
      .select('*')
      .eq('licitacion_id', licitacion.id)
      .eq('tipo', 'Comentario')
      .order('created_at', { ascending: false })

    setCommentDocuments(data || [])
  }, [dataClient, licitacion.id])

  const fetchMentionUsers = useCallback(async () => {
    const { data } = await dataClient
      .from('users')
      .select('id, name, area')
      .eq('status', 'Activo')
      .order('name')

    setMentionUsers((data as any) || [])
  }, [dataClient])

  useEffect(() => {
    if (open) {
      fetchComments()
      fetchHistory()
      fetchItemDocuments()
      fetchCommentDocuments()
      fetchMentionUsers()
      setItemFiles([])
      setCommentFiles([])
      setMontoDraft(licitacion.monto && licitacion.monto > 0 ? String(licitacion.monto) : '')
    }
  }, [open, licitacion.id, fetchComments, fetchHistory, fetchItemDocuments, fetchCommentDocuments, fetchMentionUsers])

  const canEditMonto = isAdmin() && licitacion.current_process === 'solicitud'

  const handleSaveMonto = async () => {
    if (!canEditMonto) return
    const nextMonto = montoDraft.trim() === '' ? 0 : Number(montoDraft)
    if (montoDraft.trim() !== '' && Number.isNaN(nextMonto)) {
      toast({
        title: 'Monto inválido',
        description: 'Ingresá un monto válido.',
        variant: 'destructive',
      })
      return
    }

    setSavingMonto(true)
    try {
      const { error } = await dataClient
        .from('licitaciones')
        .update({
          monto: nextMonto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', licitacion.id)

      if (error) throw error

      await dataClient.from('licitacion_histories').insert({
        id: crypto.randomUUID(),
        licitacion_id: licitacion.id,
        usuario_id: userData?.id,
        accion: `${userData?.name || 'Usuario'} actualizó el monto`,
        tipo: 'edicion',
      })

      if (userData) {
        await logLicitacionAction(
          userData,
          'editar',
          licitacion.id,
          licitacion.opl,
          `Actualizó el monto de la licitación a ${nextMonto}`,
          { monto: nextMonto }
        )
      }

      toast({
        title: 'Monto actualizado',
        description: 'El monto se guardó correctamente.',
      })

      onUpdate()
    } catch (error) {
      console.error('Error updating monto:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el monto.',
        variant: 'destructive',
      })
    } finally {
      setSavingMonto(false)
    }
  }

  const updateMentionQuery = (text: string) => {
    const cursorText = text.split(/\s/).pop() || ''
    const match = cursorText.match(/@([\wñáéíóúÁÉÍÓÚüÜ]+)/)
    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setShowMentionList(true)
    } else {
      setMentionQuery('')
      setShowMentionList(false)
    }
  }

  const handleInsertMention = (userName: string) => {
    const clean = userName.replace(/\s+/g, '')
    setNewComment((prev) => {
      const replaced = prev.replace(/@[\wñáéíóúÁÉÍÓÚüÜ]*$/, `@${clean} `)
      const nextValue = prev.match(/@[\wñáéíóúÁÉÍÓÚüÜ]*$/) ? replaced : `${prev}@${clean} `
      return nextValue
    })
    setShowMentionList(false)
    setMentionQuery('')
  }

  const handleAddComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) return

    setLoading(true)
    setUploadingCommentFiles(true)
    try {
      const { data: { user } } = await dataClient.auth.getUser()
      if (!user || !user.email) {
        toast({
          title: 'Error',
          description: 'Debes estar autenticado para comentar.',
          variant: 'destructive',
        })
        return
      }

      // Buscar usuario por email (el ID de Auth puede no coincidir con el ID en users)
      const { data: userData, error: userError } = await dataClient
        .from('users')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle()

      if (userError) {
        console.error('Error buscando usuario:', userError)
        toast({
          title: 'Error',
          description: 'Error al verificar usuario. Por favor, intenta nuevamente.',
          variant: 'destructive',
        })
        return
      }

      if (!userData) {
        toast({
          title: 'Error',
          description: 'Usuario no encontrado en el sistema. Por favor, contacta al administrador.',
          variant: 'destructive',
        })
        return
      }

      if (newComment.trim()) {
        const commentId = crypto.randomUUID()
        const now = new Date().toISOString()
        const { error } = await (dataClient.from('comments') as any).insert({
          id: commentId,
          content: newComment,
          user_id: userData.id,
          licitacion_id: licitacion.id,
          created_at: now,
          updated_at: now,
        })

        if (error) throw error

        // Detectar menciones y notificar
        const { notifyMentionedUsers } = await import('@/lib/notifications')
        await notifyMentionedUsers({
          commentContent: newComment,
          commentAuthorId: userData.id,
          commentAuthorName: userData.name,
          referenceId: licitacion.id,
          referenceType: 'licitacion',
        })
      }

      if (commentFiles.length > 0) {
        for (const file of commentFiles) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('tipo', 'Comentario')

          const response = await fetch(`/api/licitaciones/${licitacion.id}/archivos`, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Error al subir archivo')
          }
        }
      }

      toast({
        title: 'Comentario agregado',
        description: commentFiles.length > 0 
          ? `Comentario y ${commentFiles.length} archivo(s) agregados exitosamente.`
          : 'Tu comentario ha sido guardado exitosamente.',
      })

      setNewComment('')
      setCommentFiles([])
      fetchComments()
      fetchItemDocuments()
      fetchCommentDocuments()
      onUpdate()
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo agregar el comentario.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setUploadingCommentFiles(false)
    }
  }

  const handleDeleteCommentFile = async (documentId: string) => {
    try {
      const response = await fetch(`/api/licitaciones/${licitacion.id}/archivos?documentId=${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar archivo')
      }

      fetchCommentDocuments()
      toast({
        title: 'Archivo eliminado',
        description: 'El archivo fue eliminado correctamente.',
      })
    } catch (error) {
      console.error('Error deleting comment file:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el archivo.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClick = () => {
    if (!canDeleteLicitacion(licitacion)) {
      toast({
        title: 'Sin permisos',
        description: getPermissionErrorMessage(licitacion),
        variant: 'destructive',
      })
      return
    }
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!canDeleteLicitacion(licitacion)) {
      toast({
        title: 'Sin permisos',
        description: getPermissionErrorMessage(licitacion),
        variant: 'destructive',
      })
      setShowDeleteDialog(false)
      return
    }

    setDeleting(true)
    try {
      const { data, error } = await dataClient
        .from('licitaciones')
        .delete()
        .eq('id', licitacion.id)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) {
        toast({
          title: 'No se pudo eliminar',
          description: 'La licitación ya no está disponible o fue eliminada previamente.',
          variant: 'destructive',
        })
        setShowDeleteDialog(false)
        onUpdate()
        return
      }

      if (userData) {
        await logLicitacionAction(
          userData,
          'eliminar',
          licitacion.id,
          licitacion.opl,
          'Licitación eliminada desde detalle'
        )
      }

      toast({
        title: 'Licitación eliminada',
        description: `La licitación ${licitacion.opl} se eliminó correctamente.`,
      })
      setShowDeleteDialog(false)
      onOpenChange(false)
      onUpdate()
    } catch (error) {
      console.error('Error deleting licitacion:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la licitación.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleUploadItemFiles = async () => {
    if (itemFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un archivo',
        variant: 'destructive',
      })
      return
    }

    setUploadingItemFiles(true)
    try {
      for (const file of itemFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo', 'Detalle Items')

        const response = await fetch(`/api/licitaciones/${licitacion.id}/archivos`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al subir archivo')
        }
      }

      toast({
        title: 'Archivos subidos',
        description: `${itemFiles.length} archivo(s) subido(s) correctamente`,
      })

      setItemFiles([])
      fetchItemDocuments()
      onUpdate()
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron subir los archivos',
        variant: 'destructive',
      })
    } finally {
      setUploadingItemFiles(false)
    }
  }

  const handleDeleteItemFile = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/licitaciones/${licitacion.id}/archivos?documentId=${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar archivo')
      }

      toast({
        title: 'Archivo eliminado',
        description: 'El archivo se eliminó correctamente',
      })

      fetchItemDocuments()
      onUpdate()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el archivo',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-12">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{licitacion.opl}</DialogTitle>
              <p className="text-muted-foreground mt-1">{licitacion.empresa}</p>
              <div className="flex gap-2 mt-3">
                <Badge className={getPriorityColor(licitacion.prioridad)} variant="outline">
                  {licitacion.prioridad}
                </Badge>
                <Badge className={getStatusColor(licitacion.estado)}>
                  {licitacion.estado}
                </Badge>
              </div>
            </div>
            {canDeleteLicitacion(licitacion) && (
              <Button size="sm" variant="destructive" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Obra/Proyecto</p>
                  <p className="text-sm text-muted-foreground">{licitacion.obra}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Monto Estimado</p>
                  {canEditMonto ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Sin monto"
                        value={montoDraft}
                        onChange={(e) => setMontoDraft(e.target.value)}
                        className="h-8 w-40"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveMonto}
                        disabled={savingMonto}
                      >
                        {savingMonto ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-green-600">
                      {licitacion.monto && licitacion.monto > 0 ? formatMoney(licitacion.monto) : 'Sin monto'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Creador</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-purple-500 text-white">
                        {licitacion.creador?.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{licitacion.creador?.name}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Lugar de Entrega</p>
                  <p className="text-sm text-muted-foreground">{licitacion.lugar_entrega}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Área de Solicitud</p>
                  <p className="text-sm text-muted-foreground">{licitacion.area_solicitud}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fecha de Creación</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(licitacion.fecha_creacion)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Detalle de Ítems */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalle de Ítems
            </h3>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{licitacion.detalle_items}</p>
            </div>

            {/* Archivos adjuntos de detalle de items */}
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Archivos adjuntos</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    const validFiles = files.filter(file => {
                      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
                      const allowedExtensions = ['.xlsx', '.xls', '.pdf', '.csv', '.png', '.jpg', '.jpeg']
                      if (!allowedExtensions.includes(extension)) {
                        toast({
                          title: 'Error',
                          description: `El archivo ${file.name} no es un tipo permitido. Solo se permiten: PDF, Excel, CSV, PNG, JPG`,
                          variant: 'destructive',
                        })
                        return false
                      }
                      if (file.size > 50 * 1024 * 1024) {
                        toast({
                          title: 'Error',
                          description: `El archivo ${file.name} es demasiado grande (máximo 50MB)`,
                          variant: 'destructive',
                        })
                        return false
                      }
                      return true
                    })
                    setItemFiles([...itemFiles, ...validFiles])
                  }}
                  className="text-sm flex-1"
                />
                {itemFiles.length > 0 && (
                  <Button
                    onClick={handleUploadItemFiles}
                    disabled={uploadingItemFiles}
                    className="shrink-0"
                  >
                    {uploadingItemFiles ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Guardar archivos
                      </>
                    )}
                  </Button>
                )}
              </div>
              {itemFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {itemFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setItemFiles(itemFiles.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {itemFiles.length} archivo(s) seleccionado(s). Haz clic en &quot;Guardar archivos&quot; para subirlos.
                  </p>
                </div>
              )}

              {itemDocuments.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">Archivos adjuntos ({itemDocuments.length})</Label>
                  <div className="space-y-2">
                    {itemDocuments.map((doc) => {
                      const isImage = doc.nombre.toLowerCase().match(/\.(png|jpg|jpeg)$/i)
                      const isPdf = doc.nombre.toLowerCase().endsWith('.pdf')
                      const isExcel = doc.nombre.toLowerCase().match(/\.(xlsx|xls)$/i)
                      const isCsv = doc.nombre.toLowerCase().endsWith('.csv')
                      
                      return (
                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-background border rounded-md">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{doc.nombre}</span>
                          <span className="text-xs text-muted-foreground">{doc.tamano || (doc as any).tamaño}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (isImage || isPdf || isExcel || isCsv) {
                                  window.open(doc.url, '_blank')
                                } else {
                                  const link = document.createElement('a')
                                  link.href = doc.url
                                  link.download = doc.nombre
                                  link.click()
                                }
                              }}
                              title="Ver archivo"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = doc.url
                                link.download = doc.nombre
                                link.click()
                              }}
                              title="Descargar archivo"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItemFile(doc.id)}
                              disabled={loading}
                              title="Eliminar archivo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Historial */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historial de Actividad
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-purple-500 text-white">
                      {item.usuario?.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{item.accion}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.fecha)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Comentarios */}
          <div className="border rounded-lg">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition"
              onClick={() => setShowComments((prev) => !prev)}
            >
              <div className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-4 w-4" />
                Comentarios
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showComments ? 'rotate-180' : ''}`} />
            </button>

            {showComments && (
              <div className="space-y-4 px-3 pb-4">
                {/* Comments List */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map((comment) => {
                    const commentDocs = commentDocuments.filter(doc => {
                      const commentDate = new Date(comment.created_at).getTime()
                      const docDate = new Date(doc.created_at).getTime()
                      return Math.abs(commentDate - docDate) < 5000
                    })

                    return (
                      <div key={comment.id} className="bg-muted p-3 rounded-md">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              {comment.user?.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{comment.user?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(comment.created_at)}
                              </p>
                            </div>
                            {comment.content && (
                              <div className="mt-2 rounded-lg bg-background border px-3 py-2 text-sm">
                                {comment.content}
                              </div>
                            )}
                            {commentDocs.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {commentDocs.map((doc) => (
                                  <div key={doc.id} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 truncate">{doc.nombre}</span>
                                    <span className="text-xs text-muted-foreground">{doc.tamano || (doc as any).tamaño}</span>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => window.open(doc.url, '_blank')}
                                        title="Ver archivo"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const link = document.createElement('a')
                                          link.href = doc.url
                                          link.download = doc.nombre
                                          link.click()
                                        }}
                                        title="Descargar archivo"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteCommentFile(doc.id)}
                                        disabled={loading}
                                        title="Eliminar archivo"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {commentDocuments.filter(doc => {
                    const hasComment = comments.some(comment => {
                      const commentDate = new Date(comment.created_at).getTime()
                      const docDate = new Date(doc.created_at).getTime()
                      return Math.abs(commentDate - docDate) < 5000
                    })
                    return !hasComment
                  }).map((doc) => (
                    <div key={doc.id} className="bg-muted p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-blue-500 text-white">
                            ?
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Archivo adjunto</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(doc.created_at)}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{doc.nombre}</span>
                            <span className="text-xs text-muted-foreground">{doc.tamano || (doc as any).tamaño}</span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(doc.url, '_blank')}
                                title="Ver archivo"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = doc.url
                                  link.download = doc.nombre
                                  link.click()
                                }}
                                title="Descargar archivo"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteCommentFile(doc.id)}
                                disabled={loading}
                                title="Eliminar archivo"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Escribe un comentario o adjunta archivos..."
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value)
                      updateMentionQuery(e.target.value)
                    }}
                    rows={3}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AtSign className="h-3 w-3" />
                    <span>Escribe @ para mencionar</span>
                  </div>
                  {showMentionList && mentionUsers.length > 0 && (
                    <div className="border rounded-md bg-popover shadow-sm max-h-48 overflow-y-auto">
                      {mentionUsers
                        .filter(u => !mentionQuery || u.name.toLowerCase().includes(mentionQuery))
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between text-sm"
                            onClick={() => handleInsertMention(u.name)}
                          >
                            <span>{u.name}</span>
                            <span className="text-xs text-muted-foreground">{u.area}</span>
                          </button>
                        ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Input
                      type="file"
                      multiple
                      accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        const validFiles = files.filter(file => {
                          const extension = '.' + file.name.split('.').pop()?.toLowerCase()
                          const allowedExtensions = ['.xlsx', '.xls', '.pdf', '.csv', '.png', '.jpg', '.jpeg', '.doc', '.docx']
                          if (!allowedExtensions.includes(extension)) {
                            toast({
                              title: 'Error',
                              description: `El archivo ${file.name} no es un tipo permitido. Solo se permiten: PDF, Excel, CSV, PNG, JPG, DOC, DOCX`,
                              variant: 'destructive',
                            })
                            return false
                          }
                          if (file.size > 50 * 1024 * 1024) {
                            toast({
                              title: 'Error',
                              description: `El archivo ${file.name} es demasiado grande (máximo 50MB)`,
                              variant: 'destructive',
                            })
                            return false
                          }
                          return true
                        })
                        setCommentFiles([...commentFiles, ...validFiles])
                      }}
                      className="text-sm"
                    />
                    {commentFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {commentFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCommentFiles(commentFiles.filter((_, i) => i !== index))
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={loading || uploadingCommentFiles || (!newComment.trim() && commentFiles.length === 0)}
                  >
                    {loading || uploadingCommentFiles ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadingCommentFiles ? 'Subiendo...' : 'Enviando...'}
                      </>
                    ) : (
                      'Enviar'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar licitación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la licitación de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
