'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/mock/client'
import { formatDateTime } from '@/lib/utils'
import type { TareaLogistica, User as AppUser } from '@/lib/types'
import { AtSign, Calendar, FileText, Pencil, Save, Trash2, X } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'

interface AuditComment {
  id: string
  description: string
  created_at: string
  user_name?: string
  user_role?: string
  metadata?: {
    attachments?: {
      id: string
      name: string
      url: string
      size?: string
    }[]
  }
}

interface TareaDetailDialogProps {
  tarea: TareaLogistica | null
  open: boolean
  onOpenChange: (open: boolean) => void
  comentarios?: Record<string, AuditComment[]>
  nuevoComentario: Record<string, string>
  onComentarioChange: (id: string, value: string) => void
  usuarios: AppUser[]
  onSelectUsuario: (tareaId: string, userName: string) => void
  onGuardarComentario: (t: TareaLogistica) => void
  comentarioFiles: Record<string, File[]>
  onAddComentarioFiles: (id: string, files: File[]) => void
  onRemoveComentarioFile: (id: string, index: number) => void
  onDeleteComentarioFile: (tareaId: string, commentId: string, attachmentId: string) => void
  onDeleteComentario?: (tareaId: string, commentId: string) => void
  canDeleteComments?: boolean
  onUpdate: () => void
}

const getDateInputValue = (value?: string | null) => {
  if (!value) return ''
  if (value.includes('T')) return value.split('T')[0]
  return value
}

const extractHorarioFromFecha = (value?: string | null) => {
  if (!value || !value.includes('T')) return ''
  const timeMatch = value.match(/T(\d{2}):(\d{2})/)
  if (!timeMatch) return ''
  const hour = timeMatch[1]
  const minute = timeMatch[2]
  if (hour === '00' && minute === '00') return ''
  return `${hour}:${minute}`
}

const composeFechaConHorario = (fecha: string, horario?: string) => {
  const time = horario || '00:00'
  return `${fecha}T${time}:00`
}

const formatFecha = (value?: string | null) => {
  if (!value) return ''
  const raw = value.includes('T') ? value : `${value}T00:00:00`
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-AR')
}

const formatHorario = (value?: string | null) => {
  const hhmm = extractHorarioFromFecha(value)
  if (!hhmm) return null
  return hhmm
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

export function TareaDetailDialog({
  tarea,
  open,
  onOpenChange,
  comentarios,
  nuevoComentario,
  onComentarioChange,
  usuarios,
  onSelectUsuario,
  onGuardarComentario,
  comentarioFiles,
  onAddComentarioFiles,
  onRemoveComentarioFile,
  onDeleteComentarioFile,
  onDeleteComentario,
  canDeleteComments = false,
  onUpdate,
}: TareaDetailDialogProps) {
  const dataClient = createClient()
  const { isAdmin } = usePermissions()
  const canEditTitle = isAdmin()
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [detailValue, setDetailValue] = useState('')
  const [savingDetail, setSavingDetail] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const [fechaInicioValue, setFechaInicioValue] = useState('')
  const [fechaFinalValue, setFechaFinalValue] = useState('')
  const [horarioValue, setHorarioValue] = useState('')
  const [savingDates, setSavingDates] = useState(false)
  const [editingTitulo, setEditingTitulo] = useState(false)
  const [tituloValue, setTituloValue] = useState('')
  const [savingTitulo, setSavingTitulo] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && tarea) {
      setDetailValue(tarea.descripcion || '')
      setDetailExpanded(false)
      const fechaInicio = getDateInputValue(tarea.fecha)
      const fechaFinal = getDateInputValue(tarea.fecha_limite)
      const horario = extractHorarioFromFecha(tarea.fecha)
      setFechaInicioValue(fechaInicio)
      setFechaFinalValue(fechaFinal)
      setHorarioValue(horario)
      setEditingDates(false)
      setTituloValue(tarea.titulo || '')
      setEditingTitulo(false)
    }
  }, [open, tarea])

  const isDirty = tarea ? detailValue.trim() !== (tarea.descripcion || '').trim() : false

  const shortDescription = useMemo(() => {
    if (!tarea?.descripcion) return 'Sin descripción'
    const trimmed = tarea.descripcion.trim()
    if (trimmed.length <= 120) return trimmed
    return `${trimmed.slice(0, 120)}...`
  }, [tarea?.descripcion])

  const handleToggleDetail = () => {
    if (detailExpanded && isDirty) {
      setDetailValue(tarea?.descripcion || '')
    }
    setDetailExpanded((prev) => !prev)
  }

  const handleSaveDetail = async () => {
    if (!tarea || !isDirty) return
    setSavingDetail(true)
    const { error } = await dataClient
      .from('tareas_logistica')
      .update({ descripcion: detailValue.trim() })
      .eq('id', tarea.id)
    setSavingDetail(false)
    if (!error) {
      onUpdate()
      setDetailExpanded(false)
    }
  }

  const handleSaveTitulo = async () => {
    if (!tarea) return
    const newTitulo = tituloValue.trim()
    if (newTitulo === (tarea.titulo || '')) { setEditingTitulo(false); return }
    setSavingTitulo(true)
    const { error } = await dataClient
      .from('tareas_logistica')
      .update({ titulo: newTitulo || null, updated_at: new Date().toISOString() })
      .eq('id', tarea.id)
    setSavingTitulo(false)
    if (!error) {
      onUpdate()
      setEditingTitulo(false)
      toast({ title: 'Título actualizado', description: 'El título se guardó correctamente.' })
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const shouldBeProgramada = (inicio?: string, fin?: string) => {
    if (!inicio) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(inicio)
    start.setHours(0, 0, 0, 0)
    const diffFromToday = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffFromToday >= 3) return true
    if (fin) {
      const end = new Date(fin)
      end.setHours(0, 0, 0, 0)
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (duration > 2) return true
    }
    return false
  }

  const handleSaveDates = async () => {
    if (!tarea) return
    const nextInicio = fechaInicioValue || getDateInputValue(tarea.fecha) || ''
    const nextFinal = fechaFinalValue || getDateInputValue(tarea.fecha_limite)
    const nextHorario = horarioValue || extractHorarioFromFecha(tarea.fecha)
    if (!nextInicio) return
    setSavingDates(true)
    const shouldProgram = shouldBeProgramada(nextInicio, nextFinal)
    const nextEstado =
      tarea.estado !== 'finalizado' && shouldProgram ? 'programada' : tarea.estado
    const { error } = await dataClient
      .from('tareas_logistica')
      .update({
        fecha: composeFechaConHorario(nextInicio, nextHorario),
        fecha_limite: nextFinal ? composeFechaConHorario(nextFinal, '00:00') : null,
        estado: nextEstado,
      })
      .eq('id', tarea.id)
    setSavingDates(false)
    if (!error) {
      onUpdate()
      setEditingDates(false)
      toast({ title: 'Fechas actualizadas', description: 'Los cambios se guardaron correctamente.' })
    } else {
      toast({ title: 'Error', description: error.message || 'No se pudieron guardar las fechas.', variant: 'destructive' })
    }
  }

  if (!tarea) return null
  const horarioActual = formatHorario(tarea.fecha)

  const commentList = (comentarios && comentarios[tarea.id]) || []

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
        onAddComentarioFiles(tarea.id, [namedFile])
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
      const current = nuevoComentario[tarea.id] || ''
      const next = current.slice(0, start) + formatted + current.slice(end)
      onComentarioChange(tarea.id, next)
      setTimeout(() => {
        target.selectionStart = start + formatted.length
        target.selectionEnd = start + formatted.length
      }, 0)
    }
  }

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    onGuardarComentario(tarea)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="overflow-hidden">
          <div className="flex items-start gap-2 min-w-0 w-full">
            {editingTitulo ? (
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Input
                  autoFocus
                  value={tituloValue}
                  onChange={e => setTituloValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveTitulo()
                    if (e.key === 'Escape') setEditingTitulo(false)
                  }}
                  className="text-lg font-semibold h-9"
                  placeholder={tarea.tln}
                />
                <Button size="sm" onClick={handleSaveTitulo} disabled={savingTitulo} className="gap-1 shrink-0">
                  <Save className="h-3.5 w-3.5" />
                  {savingTitulo ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingTitulo(false); setTituloValue(tarea.titulo || '') }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <DialogTitle className="text-xl break-words">{tarea.titulo || tarea.tln}</DialogTitle>
                {canEditTitle && (
                  <button
                    type="button"
                    onClick={() => { setTituloValue(tarea.titulo || ''); setEditingTitulo(true) }}
                    className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar título"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Número de tarea</span>
            <div className="font-medium">{tarea.tln}</div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Estado</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{tarea.estado.replace('_', ' ')}</Badge>
              <Badge variant="outline">{tarea.prioridad}</Badge>
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Fechas</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatFecha(tarea.fecha)}
                {horarioActual ? ` (${horarioActual})` : ''}
                {tarea.fecha_limite ? ` → ${formatFecha(tarea.fecha_limite)}` : ''}
              </span>
            </div>
            {editingDates ? (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    type="date"
                    value={fechaInicioValue}
                    onChange={(event) => setFechaInicioValue(event.target.value)}
                  />
                  <Input
                    type="time"
                    value={horarioValue}
                    onChange={(event) => setHorarioValue(event.target.value)}
                  />
                  <Input
                    type="date"
                    value={fechaFinalValue}
                    onChange={(event) => setFechaFinalValue(event.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSaveDates} disabled={savingDates || !fechaInicioValue}>
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFechaInicioValue(getDateInputValue(tarea.fecha))
                      setFechaFinalValue(getDateInputValue(tarea.fecha_limite))
                      setHorarioValue(extractHorarioFromFecha(tarea.fecha))
                      setEditingDates(false)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingDates(true)}>
                  Editar fechas
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition font-semibold"
            onClick={handleToggleDetail}
          >
            Detalle de la tarea
            <span className="text-xs text-muted-foreground">
              {detailExpanded ? 'Contraer' : 'Expandir'}
            </span>
          </button>
          {detailExpanded ? (
            <div className="px-3 pb-4 space-y-3">
              <Textarea
                rows={5}
                value={detailValue}
                onChange={(event) => setDetailValue(event.target.value)}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveDetail} disabled={!isDirty || savingDetail}>
                  <Save className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDetailValue(tarea.descripcion || '')
                    setDetailExpanded(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-3 pb-4 text-sm text-muted-foreground break-words">{shortDescription}</div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Comentarios</h4>
          {commentList.length === 0 && (
            <div className="text-sm text-muted-foreground">No hay comentarios aún.</div>
          )}
          {commentList.length > 0 && (
            <div className="space-y-3 w-full">
              {commentList.map((comment) => (
                <div key={comment.id} className="bg-muted p-3 rounded-md w-full">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {comment.user_name?.slice(0, 2).toUpperCase() || 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{comment.user_name || 'Usuario'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                          {canDeleteComments && onDeleteComentario && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteComentario(tarea.id, comment.id)}
                              title="Eliminar comentario"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {comment.description && (
                        <div className="mt-2 rounded-lg bg-background border px-3 py-2 text-sm break-words">
                          {renderCommentContent(comment.description)}
                        </div>
                      )}
                      {(comment.metadata?.attachments || []).length > 0 && (
                        <div className="space-y-2 mt-2">
                          {(comment.metadata?.attachments || []).map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 truncate">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground">{attachment.size}</span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(attachment.url, '_blank')}
                                  title="Ver archivo"
                                >
                                  Ver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = attachment.url
                                    link.download = attachment.name
                                    link.click()
                                  }}
                                  title="Descargar archivo"
                                >
                                  Descargar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDeleteComentarioFile(tarea.id, comment.id, attachment.id)}
                                  title="Eliminar archivo"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form className="space-y-3 border rounded-lg p-3" onSubmit={handleSubmit}>
          <h4 className="text-sm font-semibold">Agregar comentario</h4>
          <Textarea
            rows={3}
            value={nuevoComentario[tarea.id] || ''}
            onChange={(event) => onComentarioChange(tarea.id, event.target.value)}
            onPaste={handleCommentPaste}
            placeholder="Escribe un comentario o adjunta archivos..."
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <AtSign className="h-3 w-3" />
            <span>Escribe @ para mencionar</span>
            <span className="opacity-40">·</span>
            <span>Pegá capturas con Ctrl+V</span>
            <span className="opacity-40">·</span>
            <span>Tablas de Excel se formatean automáticamente</span>
          </div>
          {(() => {
            const query = (nuevoComentario[tarea.id] || '').match(/@([\wñáéíóúÁÉÍÓÚüÜ]+)$/)?.[1]?.toLowerCase() || ''
            const filtered = query
              ? usuarios.filter(u => u.name.toLowerCase().includes(query))
              : []
            return filtered.length > 0 ? (
              <div className="border rounded-md bg-popover shadow-sm max-h-48 overflow-y-auto">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between text-sm"
                    onClick={() => onSelectUsuario(tarea.id, u.name)}
                  >
                    <span>{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.area}</span>
                  </button>
                ))}
              </div>
            ) : null
          })()}
          <div className="space-y-2">
            <Input
              type="file"
              multiple
              accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(event) => onAddComentarioFiles(tarea.id, Array.from(event.target.files || []))}
              className="text-sm"
            />
            {(comentarioFiles[tarea.id] || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(comentarioFiles[tarea.id] || []).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveComentarioFile(tarea.id, index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {((comentarioFiles[tarea.id] || []).length > 0) && (
            <div className="text-xs text-muted-foreground">
              {(comentarioFiles[tarea.id] || []).length} archivo(s) seleccionado(s). Haz clic en &quot;Guardar archivos&quot; para subirlos.
            </div>
          )}
          <Button
            size="sm"
            type="submit"
            onClick={handleSubmit}
            disabled={!((nuevoComentario[tarea.id] || '').trim() || (comentarioFiles[tarea.id] || []).length > 0)}
          >
            {((comentarioFiles[tarea.id] || []).length > 0 && !(nuevoComentario[tarea.id] || '').trim())
              ? 'Guardar archivos'
              : 'Enviar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
