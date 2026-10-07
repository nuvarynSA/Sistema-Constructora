'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/mock/client'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatDateTime, getPriorityColor, getStatusColor, formatMoney } from '@/lib/utils'
import {
  Calendar,
  Hash,
  Package,
  Truck,
  User,
  FileText,
  Clock,
  MessageSquare,
  DollarSign,
  Save,
  Trash2,
  Upload,
  Download,
  Eye,
  X,
  Loader2,
  ChevronDown,
  AtSign,
  Pencil,
} from 'lucide-react'
import type { Order, Comment, OrderHistory, TipoEntrega } from '@/lib/types'
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
import { useAuth } from '@/hooks/use-auth'
import { logOrderAction } from '@/lib/audit'
import { notifyOrderCreatorEvent } from '@/lib/notifications'

interface OrderDetailDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

/**
 * Sube un archivo usando una URL de subida.
 * Esto evita que el archivo pase por el servidor, lo que hace
 * los uploads mucho más rápidos para usuarios fuera de la región del servidor.
 *
 * Retorna { uploadedUrl, filename, fileSize } para pasarle al API route.
 */
async function uploadFilePresigned(
  file: File,
  folder: string
): Promise<{ uploadedUrl: string; filename: string; fileSize: string }> {
  // 1. Pedir la presigned URL al servidor
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}))
    throw new Error(err.error || 'Error obteniendo URL de upload')
  }

  const { uploadUrl, publicUrl } = await presignRes.json()

  // 2. Subir el archivo directamente (sin pasar por el servidor)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error(`Error subiendo archivo: ${uploadRes.status}`)
  }

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)

  return {
    uploadedUrl: publicUrl,
    filename: file.name,
    fileSize: `${fileSizeMB} MB`,
  }
}

const normalizeTipoEntrega = (value?: string | null): TipoEntrega => {
  return value === 'Retirar' ? 'Retirar' : 'Recibir'
}

const normalizeImputacionSegment = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const padSegment = (s: string): string => {
  // Pad numeric-only segments to 3 digits
  if (/^\d+$/.test(s)) return s.padStart(3, '0')
  return s
}

const buildImputacionCode = (
  baseImputacion?: string | null,
  imputacion?: string | null,
  subrubro?: string | null
) => {
  const base = normalizeImputacionSegment(baseImputacion)
  const imputacionPart = normalizeImputacionSegment(imputacion)
  const subrubroPart = normalizeImputacionSegment(subrubro)

  const includesBase = base && imputacionPart
    ? (imputacionPart === base || imputacionPart.startsWith(`${base}.`))
    : false

  const parts = includesBase
    ? [imputacionPart, subrubroPart]
    : [base, imputacionPart, subrubroPart]

  return parts
    .filter((part): part is string => Boolean(part))
    .map(padSegment)
    .join('.')
}

/** Renders comment text with clickable URLs and preserved newlines. */
function renderCommentContent(text: string): ReactNode {
  const URL_REGEX = /(https?:\/\/[^\s]+)/g
  const parts = text.split(URL_REGEX)
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline break-all hover:text-blue-700"
          >
            {part}
          </a>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
        )
      )}
    </>
  )
}

export function OrderDetailDialog({ order, open, onOpenChange, onUpdate }: OrderDetailDialogProps) {
  const { toast } = useToast()
  const dataClient = createClient()
  const { userData: authUserData, ensureUserData } = useAuth()
  const [obraImputacion, setObraImputacion] = useState<string | null>(null)
  const [obraImputacionesById, setObraImputacionesById] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<OrderHistory[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingRemito, setEditingRemito] = useState(false)
  const [remitoValue, setRemitoValue] = useState(order.remito || '')
  const [editingMontoOc, setEditingMontoOc] = useState(false)
  const [montoOcValue, setMontoOcValue] = useState(order.monto_oc?.toString() || '')
  const [montosOc, setMontosOc] = useState<number[]>(order.montos_oc || (order.monto_oc ? [order.monto_oc] : []))
  const [editingTipoEntrega, setEditingTipoEntrega] = useState(false)
  const [tipoEntregaValue, setTipoEntregaValue] = useState<TipoEntrega>(normalizeTipoEntrega(order.tipo_entrega))
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingRemito, setUploadingRemito] = useState(false)
  const [remitoFile, setRemitoFile] = useState<File | null>(null)
  const [uploadingDescripcion, setUploadingDescripcion] = useState(false)
  const [descripcionFiles, setDescripcionFiles] = useState<File[]>([])

  useEffect(() => {
    if (open && !authUserData) {
      ensureUserData()
    }
  }, [open, authUserData, ensureUserData])
  const [descripcionDocuments, setDescripcionDocuments] = useState<any[]>([])
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [uploadingCommentFiles, setUploadingCommentFiles] = useState(false)
  const [commentDocuments, setCommentDocuments] = useState<any[]>([])
  const [currentOrder, setCurrentOrder] = useState<Order>(order)
  const [mentionUsers, setMentionUsers] = useState<{ id: string; name: string; area: string }[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionList, setShowMentionList] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const { canDeleteOrder, canModifyOrder, canEditPendingOrder, getPermissionErrorMessage, userData, isAdmin } = usePermissions()
  const canEditTitle = isAdmin()
  const [editingDetalle, setEditingDetalle] = useState(false)
  const [detalleValue, setDetalleValue] = useState(order.detalle_materiales || '')
  const [savingDetalle, setSavingDetalle] = useState(false)
  const [editingObra, setEditingObra] = useState(false)
  const [obraValue, setObraValue] = useState(order.obra || '')
  const [savingObra, setSavingObra] = useState(false)

  useEffect(() => {
    setCurrentOrder(order)
    setTipoEntregaValue(normalizeTipoEntrega(order.tipo_entrega))
    setDetalleValue(order.detalle_materiales || '')
    setEditingDetalle(false)
    setObraValue(order.obra || '')
    setEditingObra(false)
  }, [order])

  useEffect(() => {
    if (open) {
      if (currentOrder.obra_id) {
        fetchObraImputacion(currentOrder.obra_id)
      } else {
        setObraImputacion(null)
      }
      const obraIds = [
        currentOrder.obra_id,
        ...(Array.isArray(currentOrder.obra_proyectos)
          ? currentOrder.obra_proyectos.map((row) => row.obraId)
          : []),
      ].filter((id): id is string => Boolean(id))
      fetchObrasImputaciones(obraIds)
      fetchComments()
      fetchHistory()
      fetchDescripcionDocuments()
      fetchCommentDocuments()
      fetchMentionUsers()
      setRemitoValue(currentOrder.remito || '')
      setMontoOcValue(currentOrder.monto_oc?.toString() || '')
      setMontosOc(currentOrder.montos_oc || (currentOrder.monto_oc ? [currentOrder.monto_oc] : []))
      setTipoEntregaValue(normalizeTipoEntrega(currentOrder.tipo_entrega))
      setEditingTipoEntrega(false)
      setEditingRemito(false)
      setEditingMontoOc(false)
      setRemitoFile(null)
      setDescripcionFiles([])
      setCommentFiles([])
      // Marcar notificaciones de este pedido como leídas
      dataClient
        .from('notifications')
        .update({ is_read: true })
        .eq('reference_id', currentOrder.id)
        .eq('reference_type', 'order')
        .eq('is_read', false)
        .then(() => {})
    }
  }, [open, currentOrder.id])

  const fetchObraImputacion = async (obraId: string) => {
    const { data } = await dataClient
      .from('obras')
      .select('imputacion')
      .eq('id', obraId)
      .single()

    setObraImputacion(data?.imputacion || null)
  }

  const fetchObrasImputaciones = async (obraIds: string[]) => {
    const uniqueObraIds = Array.from(new Set(obraIds.filter(Boolean)))
    if (uniqueObraIds.length === 0) {
      setObraImputacionesById({})
      return
    }

    const { data } = await dataClient
      .from('obras')
      .select('id, imputacion')
      .in('id', uniqueObraIds)

    const imputaciones: Record<string, string> = {}
    for (const obraRow of (data as Array<{ id: string; imputacion: string }> | null) || []) {
      if (obraRow.id && obraRow.imputacion) {
        imputaciones[obraRow.id] = obraRow.imputacion
      }
    }

    setObraImputacionesById(imputaciones)
  }

  const fetchDescripcionDocuments = async () => {
    const { data } = await dataClient
      .from('documents')
      .select('*')
      .eq('order_id', currentOrder.id)
      .eq('tipo', 'Descripción')
      .order('created_at', { ascending: false })

    setDescripcionDocuments(data || [])
  }

  const fetchCommentDocuments = async () => {
    const { data } = await dataClient
      .from('documents')
      .select('*')
      .eq('order_id', currentOrder.id)
      .eq('tipo', 'Comentario')
      .order('created_at', { ascending: false })

    setCommentDocuments(data || [])
  }

  const fetchMentionUsers = async () => {
    const { data } = await dataClient
      .from('users')
      .select('id, name, area')
      .eq('status', 'Activo')
      .order('name')

    setMentionUsers((data as any) || [])
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

  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Screenshot paste: if clipboard contains an image, attach it as a file
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const namedFile = new File([file], `captura-${timestamp}.png`, { type: 'image/png' })
        setCommentFiles(prev => [...prev, namedFile])
        toast({ title: 'Imagen adjuntada', description: 'La captura de pantalla se agregó como archivo adjunto.' })
      }
      return
    }
    // Excel table paste: tab-separated values → formatted plain text
    const text = e.clipboardData.getData('text/plain')
    if (text.includes('\t')) {
      e.preventDefault()
      const rows = text.split('\n').filter(row => row.trim())
      const formatted = rows.map(row => row.split('\t').join(' | ')).join('\n')
      const target = e.currentTarget
      const start = target.selectionStart ?? 0
      const end = target.selectionEnd ?? 0
      const next = newComment.slice(0, start) + formatted + newComment.slice(end)
      setNewComment(next)
      updateMentionQuery(next)
      setTimeout(() => {
        target.selectionStart = start + formatted.length
        target.selectionEnd = start + formatted.length
      }, 0)
    }
  }

  const fetchComments = async () => {
    const { data } = await dataClient
      .from('comments')
      .select('*, user:users(*)')
      .eq('order_id', currentOrder.id)
      .order('created_at', { ascending: false })

    setComments(data || [])
  }

  const fetchHistory = async () => {
    const { data } = await dataClient
      .from('order_histories')
      .select('*, usuario:users(*)')
      .eq('order_id', currentOrder.id)
      .order('created_at', { ascending: false })

    setHistory(data || [])
  }

  const handleAddComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) return

    setLoading(true)
    setUploadingCommentFiles(true)
    try {
      let activeUser = authUserData
      if (!activeUser) {
        activeUser = await ensureUserData()
      }
      if (!activeUser) {
        toast({
          title: 'Sesión no disponible',
          description: 'Tu sesión expiró o no se pudo validar. Recargá la página e intentá de nuevo.',
          variant: 'destructive',
        })
        return
      }

      if (newComment.trim()) {
        const commentId = crypto.randomUUID()
        const now = new Date().toISOString()
        const { error } = await dataClient.from('comments').insert({
          id: commentId,
          content: newComment,
          user_id: activeUser.id,
          order_id: currentOrder.id,
          created_at: now,
          updated_at: now,
        })

        if (error) throw error

        // Detectar menciones y notificar
        const { notifyMentionedUsers } = await import('@/lib/notifications')
        await notifyMentionedUsers({
          commentContent: newComment,
          commentAuthorId: activeUser.id,
          commentAuthorName: activeUser.name,
          referenceId: currentOrder.id,
          referenceType: 'order',
        })
      }

      if (commentFiles.length > 0) {
        for (const file of commentFiles) {
          let uploaded: { uploadedUrl: string; filename: string; fileSize: string } | null = null
          try {
            uploaded = await uploadFilePresigned(file, 'comentarios')
          } catch {
            uploaded = null
          }

          let response: Response
          if (uploaded) {
            response = await fetch(`/api/orders/${currentOrder.id}/comentario`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(uploaded),
            })
          } else {
            const formData = new FormData()
            formData.append('file', file)
            response = await fetch(`/api/orders/${currentOrder.id}/comentario`, {
              method: 'POST',
              body: formData,
            })
          }

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Error al subir archivo')
          }
        }
      }

      await notifyOrderCreatorEvent({
        orderId: currentOrder.id,
        solicitanteId: currentOrder.solicitante_id,
        actorId: activeUser.id,
        title: 'Nuevo comentario en tu RQI',
        message: `${activeUser.name} agregó un comentario en ${currentOrder.rqi}.`,
        type: 'order_comment',
      })

      toast({
        title: 'Comentario agregado',
        description: 'Tu comentario ha sido guardado exitosamente.',
      })

      setNewComment('')
      setCommentFiles([])
      fetchComments()
      fetchCommentDocuments()
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Error',
        description: 'No se pudo agregar el comentario.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setUploadingCommentFiles(false)
    }
  }

  const handleDeleteCommentFile = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${currentOrder.id}/comentario?documentId=${documentId}`, {
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

      fetchCommentDocuments()
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

  const handleSaveObra = async () => {
    const newObra = obraValue.trim()
    if (!newObra || newObra === currentOrder.obra) { setEditingObra(false); return }
    setSavingObra(true)
    const { error } = await dataClient
      .from('orders')
      .update({ obra: newObra, updated_at: new Date().toISOString() })
      .eq('id', currentOrder.id)
    setSavingObra(false)
    if (!error) {
      setCurrentOrder(prev => ({ ...prev, obra: newObra }))
      setEditingObra(false)
      toast({ title: 'Obra actualizada', description: 'El nombre de la obra se guardó correctamente.' })
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleSaveDetalle = async () => {
    const newDetalle = detalleValue.trim()
    if (newDetalle === (currentOrder.detalle_materiales || '')) { setEditingDetalle(false); return }
    setSavingDetalle(true)
    const { error } = await dataClient
      .from('orders')
      .update({ detalle_materiales: newDetalle, updated_at: new Date().toISOString() })
      .eq('id', currentOrder.id)
    setSavingDetalle(false)
    if (!error) {
      setCurrentOrder(prev => ({ ...prev, detalle_materiales: newDetalle }))
      setEditingDetalle(false)
      toast({ title: 'Detalle actualizado', description: 'El detalle de materiales se guardó correctamente.' })
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleSaveRemito = async () => {
    if (!remitoValue.trim()) {
      toast({
        title: 'Error',
        description: 'El remito no puede estar vacío',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await dataClient
        .from('orders')
        .update({ remito: remitoValue })
        .eq('id', currentOrder.id)

      if (error) throw error

      if (userData) {
        await notifyOrderCreatorEvent({
          orderId: currentOrder.id,
          solicitanteId: currentOrder.solicitante_id,
          actorId: userData.id,
          title: 'Remito actualizado',
          message: `${userData.name} actualizó el número de remito de ${currentOrder.rqi}.`,
          type: 'order_remito',
        })
      }

      toast({
        title: 'Remito actualizado',
        description: 'El remito se actualizó correctamente',
      })

      setEditingRemito(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating remito:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el remito',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMontoOc = async () => {
    const monto = parseFloat(montoOcValue)
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser un número válido mayor a 0',
        variant: 'destructive',
      })
      return
    }

    const nextMontos = [...montosOc, monto]
    const totalMontoOc = nextMontos.reduce((sum, value) => sum + value, 0)

    setLoading(true)
    try {
      const { error } = await dataClient
        .from('orders')
        .update({ monto_oc: totalMontoOc, montos_oc: nextMontos })
        .eq('id', order.id)

      if (error) throw error

      toast({
        title: 'Monto OC actualizado',
        description: 'El monto de la orden de compra se registró correctamente',
      })

      setEditingMontoOc(false)
      setMontoOcValue('')
      setMontosOc(nextMontos)
      
      const { data: updatedOrder } = await dataClient
        .from('orders')
        .select(`
          *,
          solicitante:users!solicitante_id(*),
          responsable:users!responsable_id(*)
        `)
        .eq('id', currentOrder.id)
        .single()
      
      if (updatedOrder) {
        setCurrentOrder(updatedOrder as Order)
      }
      
      onUpdate()
    } catch (error) {
      console.error('Error updating monto_oc:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el monto de la OC',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTipoEntrega = async () => {
    const previousTipoEntrega = normalizeTipoEntrega(currentOrder.tipo_entrega)
    if (tipoEntregaValue === previousTipoEntrega) {
      setEditingTipoEntrega(false)
      return
    }

    setLoading(true)
    try {
      const { error } = await dataClient
        .from('orders')
        .update({ tipo_entrega: tipoEntregaValue })
        .eq('id', currentOrder.id)

      if (error) throw error

      if (userData) {
        await notifyOrderCreatorEvent({
          orderId: currentOrder.id,
          solicitanteId: currentOrder.solicitante_id,
          actorId: userData.id,
          title: 'Tipo de entrega actualizado',
          message: `${userData.name} actualizó el tipo de entrega de ${currentOrder.rqi} a ${tipoEntregaValue}.`,
          type: 'order_delivery_type',
        })
      }

      setCurrentOrder((prev) => ({ ...prev, tipo_entrega: tipoEntregaValue }))
      setEditingTipoEntrega(false)

      toast({
        title: 'Tipo de entrega actualizado',
        description: `El pedido quedó configurado para ${tipoEntregaValue.toLowerCase()}.`,
      })

      onUpdate()
    } catch (error) {
      console.error('Error updating delivery type:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el tipo de entrega',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadRemito = async () => {
    if (!remitoFile) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un archivo',
        variant: 'destructive',
      })
      return
    }

    setUploadingRemito(true)
    try {
      const formData = new FormData()
      formData.append('file', remitoFile)

      const response = await fetch(`/api/orders/${currentOrder.id}/remito`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir remito')
      }

      if (userData) {
        await notifyOrderCreatorEvent({
          orderId: currentOrder.id,
          solicitanteId: currentOrder.solicitante_id,
          actorId: userData.id,
          title: 'Remito adjunto',
          message: `${userData.name} adjuntó un remito en ${currentOrder.rqi}.`,
          type: 'order_remito',
        })
      }

      toast({
        title: 'Remito subido',
        description: 'El remito se subió correctamente',
      })

      setRemitoFile(null)
      
      const { data: updatedOrder } = await dataClient
        .from('orders')
        .select(`
          *,
          solicitante:users!solicitante_id(*),
          responsable:users!responsable_id(*)
        `)
        .eq('id', currentOrder.id)
        .single()
      
      if (updatedOrder) {
        setCurrentOrder(updatedOrder as Order)
      }
      
      onUpdate()
    } catch (error) {
      console.error('Error uploading remito:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo subir el remito',
        variant: 'destructive',
      })
    } finally {
      setUploadingRemito(false)
    }
  }

  const handleDeleteRemito = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar el remito?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${currentOrder.id}/remito`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar remito')
      }

      if (userData) {
        await notifyOrderCreatorEvent({
          orderId: currentOrder.id,
          solicitanteId: currentOrder.solicitante_id,
          actorId: userData.id,
          title: 'Remito eliminado',
          message: `${userData.name} eliminó el remito de ${currentOrder.rqi}.`,
          type: 'order_remito',
        })
      }

      toast({
        title: 'Remito eliminado',
        description: 'El remito se eliminó correctamente',
      })

      const { data: updatedOrder } = await dataClient
        .from('orders')
        .select(`
          *,
          solicitante:users!solicitante_id(*),
          responsable:users!responsable_id(*)
        `)
        .eq('id', currentOrder.id)
        .single()
      
      if (updatedOrder) {
        setCurrentOrder(updatedOrder as Order)
      }
      
      onUpdate()
    } catch (error) {
      console.error('Error deleting remito:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el remito',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = () => {
    if (!canDeleteOrder(order)) {
      toast({
        title: 'Sin permisos',
        description: getPermissionErrorMessage(order),
        variant: 'destructive',
      })
      return
    }
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!canDeleteOrder(order)) {
      toast({
        title: 'Sin permisos',
        description: getPermissionErrorMessage(order),
        variant: 'destructive',
      })
      setShowDeleteDialog(false)
      return
    }

    setDeleting(true)
    try {
      const { data, error } = await dataClient
        .from('orders')
        .delete()
        .eq('id', currentOrder.id)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) {
        toast({
          title: 'No se pudo eliminar',
          description: 'El pedido ya no está disponible o fue eliminado previamente.',
          variant: 'destructive',
        })
        setShowDeleteDialog(false)
        onUpdate()
        return
      }

      if (userData) {
        await logOrderAction(
          userData,
          'eliminar',
          currentOrder.id,
          currentOrder.rqi,
          'Pedido eliminado desde solicitudes'
        )
      }

      toast({
        title: 'Pedido eliminado',
        description: `El pedido ${currentOrder.rqi} se eliminó correctamente.`,
      })
      setShowDeleteDialog(false)
      onOpenChange(false)
      onUpdate()
    } catch (error) {
      console.error('Error deleting order:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el pedido.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleUploadDescripcionFiles = async () => {
    if (descripcionFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un archivo',
        variant: 'destructive',
      })
      return
    }

    setUploadingDescripcion(true)
    try {
      for (const file of descripcionFiles) {
        // Intentar upload directo para mayor velocidad.
        // Si falla (ej: error de red), cae al flujo tradicional.
        let uploaded: { uploadedUrl: string; filename: string; fileSize: string } | null = null
        try {
          uploaded = await uploadFilePresigned(file, 'descripciones')
        } catch {
          uploaded = null
        }

        let response: Response
        if (uploaded) {
          // Flujo rápido: el archivo ya está subido, solo registrar metadata
          response = await fetch(`/api/orders/${currentOrder.id}/descripcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uploaded),
          })
        } else {
          // Flujo de respaldo: enviar archivo a través del servidor
          const formData = new FormData()
          formData.append('file', file)
          response = await fetch(`/api/orders/${currentOrder.id}/descripcion`, {
            method: 'POST',
            body: formData,
          })
        }

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al subir archivo')
        }
      }

      if (userData) {
        await notifyOrderCreatorEvent({
          orderId: currentOrder.id,
          solicitanteId: currentOrder.solicitante_id,
          actorId: userData.id,
          title: 'Archivos adjuntos en tu RQI',
          message: `${userData.name} adjuntó archivos en ${currentOrder.rqi}.`,
          type: 'order_attachment',
        })
      }

      toast({
        title: 'Archivos subidos',
        description: `${descripcionFiles.length} archivo(s) subido(s) correctamente`,
      })

      setDescripcionFiles([])
      fetchDescripcionDocuments()
      onUpdate()
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron subir los archivos',
        variant: 'destructive',
      })
    } finally {
      setUploadingDescripcion(false)
    }
  }

  const handleDeleteDescripcionFile = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${currentOrder.id}/descripcion?documentId=${documentId}`, {
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

      fetchDescripcionDocuments()
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

  const canDelete = canDeleteOrder(currentOrder)
  const canEditDeliveryType = canEditPendingOrder(currentOrder) || canModifyOrder(currentOrder)
  const imputacionCodes = (() => {
    if (Array.isArray(currentOrder.obra_proyectos) && currentOrder.obra_proyectos.length > 0) {
      const codes = currentOrder.obra_proyectos
        .map((row) => {
          const baseImputacion = row.obraId
            ? (obraImputacionesById[row.obraId] || null)
            : obraImputacion

          return buildImputacionCode(baseImputacion, row.imputacion, row.subrubro)
        })
        .filter((code) => code.length > 0)

      return codes.length > 0 ? codes : ['—']
    }

    const legacyCode = buildImputacionCode(
      obraImputacion,
      currentOrder.obra_proyecto1,
      currentOrder.obra_proyecto2
    )
    return [legacyCode || '—']
  })()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button:last-child]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl">{currentOrder.rqi}</DialogTitle>
              {editingObra ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    value={obraValue}
                    onChange={e => setObraValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveObra()
                      if (e.key === 'Escape') setEditingObra(false)
                    }}
                    className="flex-1 text-sm border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Nombre de la obra..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveObra}
                    disabled={savingObra}
                    className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingObra ? '...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingObra(false)}
                    className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 group">
                  <p className="text-muted-foreground">{currentOrder.obra}</p>
                  {canEditTitle && (
                    <button
                      type="button"
                      onClick={() => { setObraValue(currentOrder.obra); setEditingObra(true) }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      title="Editar obra"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Badge className={getPriorityColor(currentOrder.prioridad)} variant="outline">
                  {currentOrder.prioridad}
                </Badge>
                <Badge className={getStatusColor(currentOrder.estado)}>
                  {currentOrder.estado}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar RQI
                </Button>
              )}
              <DialogClose className="rounded-lg p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Solicitante</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {currentOrder.solicitante?.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{currentOrder.solicitante?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fecha de Necesidad</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(currentOrder.fecha_necesidad)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Tipo de Entrega</Label>

                  {editingTipoEntrega ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={tipoEntregaValue === 'Recibir' ? 'default' : 'outline'}
                          onClick={() => setTipoEntregaValue('Recibir')}
                          disabled={loading}
                        >
                          Recibir
                        </Button>
                        <Button
                          size="sm"
                          variant={tipoEntregaValue === 'Retirar' ? 'default' : 'outline'}
                          onClick={() => setTipoEntregaValue('Retirar')}
                          disabled={loading}
                        >
                          Retirar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveTipoEntrega}
                          disabled={loading}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTipoEntrega(false)
                            setTipoEntregaValue(normalizeTipoEntrega(currentOrder.tipo_entrega))
                          }}
                          disabled={loading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          normalizeTipoEntrega(currentOrder.tipo_entrega) === 'Recibir'
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                            : 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700'
                        }
                      >
                        {normalizeTipoEntrega(currentOrder.tipo_entrega)}
                      </Badge>
                      {canEditDeliveryType && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTipoEntregaValue(normalizeTipoEntrega(currentOrder.tipo_entrega))
                            setEditingTipoEntrega(true)
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Código de Imputación</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {imputacionCodes.map((code, index) => (
                      <div key={`${code}-${index}`} className="overflow-x-auto">
                        <span className="inline-block font-mono whitespace-nowrap">{code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Área de Solicitud</p>
                  <p className="text-sm text-muted-foreground">{currentOrder.area_solicitud}</p>
                </div>
              </div>

              {/* Monto OC - editable en Compras */}
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Montos de OC</Label>
                  {montosOc.length > 0 ? (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {montosOc.map((value, index) => (
                        <div key={`${value}-${index}`} className="flex items-center justify-between">
                          <span>OC {index + 1}</span>
                          <span>{formatMoney(value)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between font-medium text-foreground pt-1 border-t">
                        <span>Total</span>
                        <span>{formatMoney(montosOc.reduce((sum, value) => sum + value, 0))}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No asignado</p>
                  )}

                  {currentOrder.current_area === 'compras' && (
                    <>
                      {editingMontoOc ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={montoOcValue}
                            onChange={(e) => setMontoOcValue(e.target.value)}
                            placeholder="0.00"
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveMontoOc}
                            disabled={loading}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMontoOc(false)
                              setMontoOcValue('')
                            }}
                            disabled={loading}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingMontoOc(true)}
                        >
                          Agregar monto
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Remito - Solo editable en Logística */}
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Remito</Label>
                  
                  {/* Número de remito (texto) */}
                  {currentOrder.current_area === 'logistica' && editingRemito ? (
                    <div className="flex gap-2">
                      <Input
                        value={remitoValue}
                        onChange={(e) => setRemitoValue(e.target.value)}
                        placeholder="Número de remito"
                        className="w-48"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveRemito}
                        disabled={loading}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingRemito(false)
                          setRemitoValue(currentOrder.remito || '')
                        }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {currentOrder.remito || 'N/A'}
                      </p>
                      {currentOrder.current_area === 'logistica' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingRemito(true)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Archivo de remito */}
                  <div className="space-y-2">
                    {currentOrder.remito_url ? (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">
                          Remito adjunto
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(currentOrder.remito_url, '_blank')}
                            title="Ver remito"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = currentOrder.remito_url!
                              link.download = `remito-${currentOrder.rqi}.pdf`
                              link.click()
                            }}
                            title="Descargar remito"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {currentOrder.current_area === 'logistica' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleDeleteRemito}
                              disabled={loading}
                              title="Eliminar remito"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : currentOrder.current_area === 'logistica' ? (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast({
                                  title: 'Error',
                                  description: 'El archivo es demasiado grande (máximo 10MB)',
                                  variant: 'destructive',
                                })
                                return
                              }
                              setRemitoFile(file)
                            }
                          }}
                          className="text-sm"
                        />
                        {remitoFile && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground truncate flex-1">
                              {remitoFile.name}
                            </span>
                            <Button
                              size="sm"
                              onClick={handleUploadRemito}
                              disabled={uploadingRemito}
                            >
                              {uploadingRemito ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3 w-3 mr-1" />
                                  Subir
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRemitoFile(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fecha de Creación</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(currentOrder.fecha_creacion)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Detalle de Materiales */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Detalle de Materiales
              {canEditTitle && !editingDetalle && (
                <button
                  type="button"
                  onClick={() => { setDetalleValue(currentOrder.detalle_materiales || ''); setEditingDetalle(true) }}
                  className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Editar detalle"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </h3>
            {editingDetalle ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={detalleValue}
                  onChange={e => setDetalleValue(e.target.value)}
                  rows={5}
                  className="text-sm"
                  placeholder="Detalle de materiales..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveDetalle} disabled={savingDetalle} className="gap-1">
                    <Save className="h-3.5 w-3.5" />
                    {savingDetalle ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDetalle(false)}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{currentOrder.detalle_materiales}</p>
              </div>
            )}
            
            {/* Archivos adjuntos de descripción */}
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Archivos adjuntos</Label>
              <Input
                type="file"
                multiple
                accept="*/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const validFiles = files.filter(file => {
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
                  setDescripcionFiles(validFiles)
                }}
                className="text-sm"
              />
              {descripcionFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {descripcionFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDescripcionFiles(descripcionFiles.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUploadDescripcionFiles}
                    disabled={uploadingDescripcion}
                  >
                    {uploadingDescripcion ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Subir archivos
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {descripcionDocuments.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">Archivos subidos</Label>
                  <div className="space-y-2">
                    {descripcionDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-background border rounded-md">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{doc.nombre}</span>
                        <span className="text-xs text-muted-foreground">{doc.tamano || doc.tamaño}</span>
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
                            onClick={() => handleDeleteDescripcionFile(doc.id)}
                            disabled={loading}
                            title="Eliminar archivo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
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
                            <div className="mt-2 rounded-lg bg-background border px-3 py-2 text-sm break-words">
                              {renderCommentContent(comment.content)}
                            </div>
                          )}
                          {commentDocs.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {commentDocs.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="flex-1 truncate">{doc.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{doc.tamano || doc.tamaño}</span>
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
                          <span className="text-xs text-muted-foreground">{doc.tamano || doc.tamaño}</span>
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
                  onPaste={handleCommentPaste}
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <AtSign className="h-3 w-3" />
                  <span>Escribe @ para mencionar</span>
                  <span className="opacity-40">·</span>
                  <span>Pegá capturas con Ctrl+V</span>
                  <span className="opacity-40">·</span>
                  <span>Tablas de Excel se formatean automáticamente</span>
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
    </Dialog>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la RQI de forma permanente. Solo administradores pueden realizarla.
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
    </>
  )
}
