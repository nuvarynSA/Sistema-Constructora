'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Package, Truck, ClipboardList, BarChart2, TrendingUp, Users,
  Zap, ShieldCheck, Smartphone, Cloud, Bell, Paperclip, Search, Palette,
  PenLine, CheckCircle2, Navigation, FileBarChart,
  ArrowRight, Mail, ChevronRight, Phone, MessageCircle,
} from 'lucide-react'

/* ─────────────────── CONTACTO ─────────────────── */
const PHONE_RAW  = '5493516874903'             // sin +, sin espacios
const PHONE_DISP = '+54 9 3516 87-4903'
const WA_URL     = `https://wa.me/${PHONE_RAW}?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20Nexora%20%F0%9F%91%8B`
const TEL_URL    = `tel:+${PHONE_RAW}`

/* ─────────────────── SCROLL HELPER ─────────────────── */
const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' })
}

/* ─────────────────── DATA ─────────────────── */
const ORDERS = [
  { id:'RQI-2026-201', obra:'Edificio Norte',  estado:'Pendiente',  prio:'Alta',  monto:185000, items:'Hierros corrugados 12 mm × 500 kg' },
  { id:'RQI-2026-202', obra:'Proyecto 108',    estado:'En Proceso', prio:'Media', monto:42500,  items:'Cerámicos 60×60 blancos × 200 m²' },
  { id:'RQI-2026-203', obra:'Poder Judicial',  estado:'Aprobado',   prio:'Alta',  monto:231339, items:'Carpintería de aluminio + vidrio' },
  { id:'RQI-2026-204', obra:'Remodelación Sur',estado:'Finalizado', prio:'Baja',  monto:15600,  items:'Pintura acrílica 20 L × 50 unidades' },
  { id:'RQI-2026-205', obra:'Club Social JM',  estado:'Pendiente',  prio:'Media', monto:89000,  items:'Vidrios templados 8 mm' },
  { id:'RQI-2026-206', obra:'Edificio Norte',  estado:'En Proceso', prio:'Alta',  monto:320000, items:'Cemento Portland × 500 bolsas' },
]
const TASKS = [
  { id:'TLN-001', title:'Entrega materiales Obra Norte',      vehicle:'KANGOO 1', prio:'Alta',  estado:'en_curso',  tipo:'TAREA' },
  { id:'TLN-002', title:'Retiro herramientas Proyecto 108',   vehicle:'MASTER',   prio:'Media', estado:'pendiente', tipo:'TAREA' },
  { id:'TLN-003', title:'Consulta proveedor Cerámicos S.A.',  vehicle:'',         prio:'Baja',  estado:'finalizado',tipo:'CONSULTA' },
  { id:'TLN-004', title:'Inspección depósito central',        vehicle:'ALASKAN',  prio:'Alta',  estado:'pendiente', tipo:'TAREA' },
  { id:'TLN-005', title:'Entrega carpintería Poder Judicial', vehicle:'SAVEIRO',  prio:'Alta',  estado:'en_curso',  tipo:'TAREA' },
]
const STOCK_ITEMS = [
  { name:'Cemento Portland',    stock:245,  min:100, unit:'bolsas' },
  { name:'Hierro 12 mm',        stock:48,   min:100, unit:'barras' },
  { name:'Cerámicos 60×60',     stock:380,  min:50,  unit:'m²' },
  { name:'Pintura acrílica',    stock:92,   min:30,  unit:'litros' },
  { name:'Cable unipolar 4 mm', stock:1200, min:200, unit:'mts' },
]
const MONTHLY = [
  { mes:'Ene', pedidos:12, monto:485 },
  { mes:'Feb', pedidos:18, monto:762 },
  { mes:'Mar', pedidos:15, monto:632 },
  { mes:'Abr', pedidos:22, monto:891 },
  { mes:'May', pedidos:28, monto:1240 },
  { mes:'Jun', pedidos:31, monto:1580 },
]
const PIE_DATA = [
  { name:'Finalizado', value:45, color:'#10b981' },
  { name:'En Proceso', value:30, color:'#3b82f6' },
  { name:'Pendiente',  value:15, color:'#f59e0b' },
  { name:'Aprobado',   value:10, color:'#8b5cf6' },
]
const MODULES = [
  { Icon:Package,       title:'Pedidos (RQIs)', color:'#6366f1',
    desc:'Gestión completa de solicitudes de compra con flujo Kanban, imputaciones contables y trazabilidad total.',
    feats:['Kanban multi-etapa','Imputación xxx.xxx.xxx','Notificaciones realtime','Historial de actividad'] },
  { Icon:Truck,         title:'Logística', color:'#06b6d4',
    desc:'Control de tareas logísticas, asignación de vehículos y seguimiento de entregas en obra.',
    feats:['5 vehículos disponibles','Prioridades dinámicas','Comentarios + archivos','Estado en tiempo real'] },
  { Icon:ClipboardList, title:'Licitaciones', color:'#8b5cf6',
    desc:'Administración del proceso de licitación desde la creación hasta el cierre con toda su documentación.',
    feats:['Flujo de aprobación','Adjuntos ilimitados','Historial completo','Multi-área'] },
  { Icon:BarChart2,     title:'Stock', color:'#10b981',
    desc:'Control de inventario en tiempo real con alertas de stock mínimo y trazabilidad por obra.',
    feats:['Alertas automáticas','Por obra y depósito','Movimientos auditados','Reportes de stock'] },
  { Icon:TrendingUp,    title:'Reportes', color:'#f59e0b',
    desc:'Dashboard ejecutivo con gráficos en tiempo real sobre pedidos, montos y performance por obra.',
    feats:['Gráficos interactivos','Exportación Excel/PDF','Filtros avanzados','KPIs por obra'] },
  { Icon:Users,         title:'Usuarios y Roles', color:'#ef4444',
    desc:'Control de acceso granular con roles personalizables y auditoría completa de todas las acciones.',
    feats:['Roles y permisos','Auditoría completa','Notificaciones push','Multi-área'] },
]

/* ─────────────────── GLOBAL CSS ─────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#040610;color:#fff;font-family:'Inter',system-ui,sans-serif;overflow-x:hidden}

::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:#040610}
::-webkit-scrollbar-thumb{background:rgba(99,102,241,.45);border-radius:3px}

@keyframes aurora{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes gtext{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes orb{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.25);opacity:.58}}
@keyframes slideup{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}

.gtext{
  background:linear-gradient(135deg,#6366f1,#a78bfa,#06b6d4,#6366f1);
  background-size:300% 300%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;animation:gtext 5s ease infinite;
}
.orb{
  position:absolute;border-radius:50%;filter:blur(90px);
  animation:orb 5s ease-in-out infinite;pointer-events:none;
}
.glass{
  background:rgba(255,255,255,.028);
  border:1px solid rgba(255,255,255,.07);
  backdrop-filter:blur(12px);
  transition:all .35s ease;
}
.glass:hover{
  background:rgba(99,102,241,.065);
  border-color:rgba(99,102,241,.4);
  box-shadow:0 0 35px rgba(99,102,241,.13),0 22px 44px rgba(0,0,0,.28);
  transform:translateY(-6px);
}
.gbtn{
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;border:none;cursor:pointer;
  padding:13px 28px;border-radius:12px;font-size:15px;font-weight:700;
  box-shadow:0 0 28px rgba(99,102,241,.45);
  transition:all .3s ease;
  font-family:inherit;
}
.gbtn:hover{box-shadow:0 0 50px rgba(99,102,241,.75);transform:translateY(-2px) scale(1.02)}
.obtn{
  background:rgba(255,255,255,.05);color:#fff;
  border:1px solid rgba(255,255,255,.14);cursor:pointer;
  padding:13px 28px;border-radius:12px;font-size:15px;font-weight:600;
  transition:all .2s;font-family:inherit;
}
.obtn:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.3)}
.tab{
  padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;
  cursor:pointer;transition:all .2s;border:1px solid rgba(255,255,255,.08);
  color:rgba(255,255,255,.5);background:transparent;font-family:inherit;
}
.tab.on{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.5);color:#fff;box-shadow:0 0 14px rgba(99,102,241,.2)}
.tab:hover:not(.on){background:rgba(255,255,255,.05);color:rgba(255,255,255,.85)}
.kcard{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  border-radius:10px;padding:10px 11px;margin-bottom:7px;
  transition:all .2s;cursor:default;
}
.kcard:hover{background:rgba(255,255,255,.075);border-color:rgba(99,102,241,.45);transform:translateX(3px)}
.pill{
  display:inline-block;padding:2px 8px;border-radius:20px;
  font-size:10px;font-weight:700;letter-spacing:.3px;
}
.reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
.reveal.in{opacity:1;transform:none}
.navlink{color:rgba(255,255,255,.55);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.navlink:hover{color:#fff}
`

/* ─────────────────── PARTICLE CANVAS ─────────────────── */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    let raf: number
    const pts: { x:number; y:number; vx:number; vy:number; r:number; a:number }[] = []
    const N = 75
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < N; i++) pts.push({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
      r: Math.random() * 1.8 + .4, a: Math.random() * .45 + .12,
    })
    function draw() {
      ctx.clearRect(0, 0, c!.width, c!.height)
      for (let i = 0; i < N; i++) {
        const p = pts[i]
        p.x = (p.x + p.vx + c!.width)  % c!.width
        p.y = (p.y + p.vy + c!.height) % c!.height
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.a})`; ctx.fill()
        for (let j = i + 1; j < N; j++) {
          const q = pts[j]
          const d = Math.hypot(p.x - q.x, p.y - q.y)
          if (d < 115) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(99,102,241,${.14 * (1 - d / 115)})`
            ctx.lineWidth = .45; ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none' }} />
}

/* ─────────────────── TYPEWRITER ─────────────────── */
const PHRASES = [
  'Pedidos, logística y stock en un solo lugar.',
  'Trazabilidad completa de cada movimiento.',
  'Reportes en tiempo real para tomar decisiones.',
  'Notificaciones instantáneas para tu equipo.',
]
function Typewriter() {
  const [text, setText] = useState('')
  const s = useRef({ ti:0, ci:0, del:false })
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    function tick() {
      const { ti, ci, del } = s.current
      const src = PHRASES[ti]
      if (!del && ci < src.length) {
        setText(src.slice(0, ci + 1)); s.current.ci++; t = setTimeout(tick, 72)
      } else if (!del && ci === src.length) {
        t = setTimeout(() => { s.current.del = true; tick() }, 2300)
      } else if (del && ci > 0) {
        setText(src.slice(0, ci - 1)); s.current.ci--; t = setTimeout(tick, 34)
      } else {
        s.current.del = false; s.current.ti = (ti + 1) % PHRASES.length; t = setTimeout(tick, 280)
      }
    }
    tick()
    return () => clearTimeout(t)
  }, [])
  return <span>{text}<span style={{ animation:'blink 1s infinite', color:'#6366f1' }}>|</span></span>
}

/* ─────────────────── COUNTER ─────────────────── */
function Counter({ to, prefix='', suffix='' }: { to:number; prefix?:string; suffix?:string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        const start = Date.now(), dur = 1900
        const run = () => {
          const p = Math.min((Date.now() - start) / dur, 1)
          setV(Math.floor((1 - Math.pow(1 - p, 3)) * to))
          if (p < 1) requestAnimationFrame(run)
        }
        requestAnimationFrame(run)
      }
    }, { threshold:.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{prefix}{v.toLocaleString('es-AR')}{suffix}</span>
}

/* ─────────────────── SCROLL REVEAL ─────────────────── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold:.08 }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ─────────────────── PILL ─────────────────── */
const PC: Record<string,[string,string,string]> = {
  Alta:  ['rgba(239,68,68,.16)','#f87171','rgba(239,68,68,.35)'],
  Media: ['rgba(245,158,11,.16)','#fbbf24','rgba(245,158,11,.35)'],
  Baja:  ['rgba(107,114,128,.15)','#9ca3af','rgba(107,114,128,.3)'],
}
function Pill({ label, c }: { label:string; c?:[string,string,string] }) {
  return c ? (
    <span className="pill" style={{ background:c[0], color:c[1], border:`1px solid ${c[2]}` }}>
      {label.replace('_',' ')}
    </span>
  ) : null
}

/* ─────────────────── SVG CHARTS ─────────────────── */
function SvgAreaChart({ data, dataKey, color }: { data: typeof MONTHLY; dataKey: 'pedidos'|'monto'; color:string }) {
  const W = 300, H = 130, pl = 8, pr = 8, pt = 10, pb = 24
  const vals = data.map(d => d[dataKey])
  const max = Math.max(...vals)
  const xStep = (W - pl - pr) / (data.length - 1)
  const yOf = (v:number) => pt + (H - pt - pb) * (1 - v / max)
  const pts = data.map((d, i) => [pl + i * xStep, yOf(d[dataKey])] as [number,number])
  const line = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${(H-pb)} L${pts[0][0].toFixed(1)},${(H-pb)} Z`
  const gid = `ag-${dataKey}`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{height:130,display:'block'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={color} stopOpacity={0.35}/>
          <stop offset="95%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line}  fill="none" stroke={color} strokeWidth="2"/>
      {data.map((d, i) => (
        <text key={i} x={pl + i*xStep} y={H-6} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize="9">{d.mes}</text>
      ))}
    </svg>
  )
}

function SvgPieChart({ data }: { data: typeof PIE_DATA }) {
  const cx = 55, cy = 55, ro = 50, ri = 28
  let angle = -Math.PI / 2
  const total = data.reduce((s, d) => s + d.value, 0)
  const slices = data.map(d => {
    const a = (d.value / total) * 2 * Math.PI
    const x1 = cx + ro * Math.cos(angle),   y1 = cy + ro * Math.sin(angle)
    const x2 = cx + ro * Math.cos(angle+a), y2 = cy + ro * Math.sin(angle+a)
    const xi1 = cx + ri * Math.cos(angle),   yi1 = cy + ri * Math.sin(angle)
    const xi2 = cx + ri * Math.cos(angle+a), yi2 = cy + ri * Math.sin(angle+a)
    const large = a > Math.PI ? 1 : 0
    const path = `M${x1.toFixed(2)},${y1.toFixed(2)} A${ro},${ro} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi2.toFixed(2)},${yi2.toFixed(2)} A${ri},${ri} 0 ${large},0 ${xi1.toFixed(2)},${yi1.toFixed(2)} Z`
    angle += a
    return { ...d, path }
  })
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color}/>)}
    </svg>
  )
}

function SvgBarChart({ data, dataKey, color }: { data: typeof MONTHLY; dataKey: 'monto'; color:string }) {
  const W = 500, H = 95, pl = 8, pr = 8, pt = 8, pb = 24
  const vals = data.map(d => d[dataKey])
  const max = Math.max(...vals)
  const bw  = (W - pl - pr) / data.length
  const gap = bw * 0.24
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{height:95,display:'block'}}>
      {data.map((d, i) => {
        const bh = (d[dataKey] / max) * (H - pt - pb)
        const x  = pl + i * bw + gap / 2
        const y  = H - pb - bh
        return (
          <g key={i}>
            <rect x={x.toFixed(1)} y={y.toFixed(1)} width={(bw-gap).toFixed(1)} height={bh.toFixed(1)} fill={color} rx="3" ry="3"/>
            <text x={(x+(bw-gap)/2).toFixed(1)} y={H-6} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize="9">{d.mes}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─────────────────── KANBAN ─────────────────── */
const KCOLS = [
  { id:'Pendiente',  color:'#f59e0b' },
  { id:'En Proceso', color:'#3b82f6' },
  { id:'Aprobado',   color:'#8b5cf6' },
  { id:'Finalizado', color:'#10b981' },
]
function PedidosKanban() {
  return (
    <div style={{ display:'flex', gap:9, overflowX:'auto', paddingBottom:6 }}>
      {KCOLS.map(col => (
        <div key={col.id} style={{ flex:'0 0 178px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.055)', borderRadius:12, padding:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:col.color, boxShadow:`0 0 7px ${col.color}`, flexShrink:0 }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.7)' }}>{col.id}</span>
            <span style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,.38)', background:'rgba(255,255,255,.07)', borderRadius:8, padding:'1px 6px' }}>
              {ORDERS.filter(o => o.estado === col.id).length}
            </span>
          </div>
          {ORDERS.filter(o => o.estado === col.id).map(o => (
            <div key={o.id} className="kcard">
              <div style={{ color:'#818cf8', fontSize:10, fontWeight:800, marginBottom:3 }}>{o.id}</div>
              <div style={{ color:'rgba(255,255,255,.82)', fontSize:11, lineHeight:1.4, marginBottom:5 }}>{o.items.slice(0,40)}…</div>
              <div style={{ color:'rgba(255,255,255,.32)', fontSize:10, marginBottom:6 }}>{o.obra}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <Pill label={o.prio} c={PC[o.prio]}/>
                <span style={{ color:'#34d399', fontSize:10, fontWeight:800 }}>${(o.monto/1000).toFixed(0)}k</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────── LOGÍSTICA ─────────────────── */
function LogisticaList() {
  const SC: Record<string,string> = { en_curso:'#3b82f6', finalizado:'#10b981', pendiente:'#f59e0b' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {TASKS.map(t => (
        <div key={t.id} style={{
          background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.065)',
          borderRadius:10, padding:'9px 13px', display:'flex', alignItems:'center', gap:11, transition:'border-color .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(6,182,212,.4)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,.065)')}
        >
          <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:SC[t.estado], boxShadow:`0 0 6px ${SC[t.estado]}` }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'rgba(255,255,255,.9)', fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
            <div style={{ color:'rgba(255,255,255,.32)', fontSize:11, marginTop:2 }}>{t.id} · {t.tipo}</div>
          </div>
          {t.vehicle && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:7, background:'rgba(6,182,212,.1)', color:'#22d3ee', border:'1px solid rgba(6,182,212,.25)', fontWeight:700, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:4 }}>
              <Truck size={11} strokeWidth={2}/> {t.vehicle}
            </span>
          )}
          <Pill label={t.prio} c={PC[t.prio]}/>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────── REPORTES ─────────────────── */
function ReportesCharts() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.055)', borderRadius:12, padding:14 }}>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, marginBottom:10 }}>Pedidos por mes</p>
        <SvgAreaChart data={MONTHLY} dataKey="pedidos" color="#6366f1"/>
      </div>

      <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.055)', borderRadius:12, padding:14 }}>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, marginBottom:10 }}>Estado de pedidos</p>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <SvgPieChart data={PIE_DATA}/>
          <div>
            {PIE_DATA.map((e,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                <span style={{ width:7, height:7, borderRadius:2, background:e.color, flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>{e.name}</span>
                <span style={{ fontSize:11, color:e.color, fontWeight:800, marginLeft:'auto' }}>{e.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ gridColumn:'1/-1', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.055)', borderRadius:12, padding:14 }}>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, marginBottom:10 }}>Monto mensual (miles AR$)</p>
        <SvgBarChart data={MONTHLY} dataKey="monto" color="#8b5cf6"/>
      </div>
    </div>
  )
}

/* ─────────────────── STOCK ─────────────────── */
function StockTable() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 68px', gap:8, padding:'3px 10px' }}>
        {['Artículo','Stock','Mínimo','Estado'].map(h => (
          <span key={h} style={{ color:'rgba(255,255,255,.28)', fontSize:10, fontWeight:700, letterSpacing:.4 }}>{h}</span>
        ))}
      </div>
      {STOCK_ITEMS.map((item,i) => {
        const low = item.stock < item.min
        return (
          <div key={i} style={{
            display:'grid', gridTemplateColumns:'2fr 1fr 1fr 68px', gap:8, alignItems:'center',
            background: low ? 'rgba(239,68,68,.04)' : 'rgba(255,255,255,.025)',
            border:`1px solid ${low ? 'rgba(239,68,68,.22)' : 'rgba(255,255,255,.065)'}`,
            borderRadius:9, padding:'9px 10px',
          }}>
            <span style={{ color:'rgba(255,255,255,.85)', fontSize:13, fontWeight:500 }}>{item.name}</span>
            <span style={{ color: low ? '#f87171' : '#34d399', fontSize:13, fontWeight:800 }}>
              {item.stock} <span style={{ color:'rgba(255,255,255,.28)', fontSize:10, fontWeight:400 }}>{item.unit}</span>
            </span>
            <span style={{ color:'rgba(255,255,255,.38)', fontSize:12 }}>{item.min}</span>
            <span className="pill" style={{
              textAlign:'center', fontSize:10,
              background: low ? 'rgba(239,68,68,.15)' : 'rgba(16,185,129,.15)',
              color:       low ? '#f87171' : '#34d399',
              border:      `1px solid ${low ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`,
            }}>
              {low ? '⚠ Bajo' : '✓ OK'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────── MAIN PAGE ─────────────────── */
export default function LandingPage() {
  const [tab, setTab] = useState('pedidos')
  useReveal()

  useEffect(() => {
    if (!document.getElementById('nx-landing')) {
      const s = document.createElement('style')
      s.id = 'nx-landing'; s.textContent = CSS
      document.head.appendChild(s)
    }
    return () => {
      // clean up on unmount so styles don't bleed into other pages
      document.getElementById('nx-landing')?.remove()
    }
  }, [])

  const DEMOS: Record<string, React.ReactNode> = {
    pedidos:   <PedidosKanban/>,
    logistica: <LogisticaList/>,
    reportes:  <ReportesCharts/>,
    stock:     <StockTable/>,
  }

  return (
    <div style={{ background:'#040610', color:'#fff', fontFamily:"'Inter',system-ui,sans-serif", minHeight:'100vh', overflowX:'hidden' }}>

      {/* ══ HERO ══ */}
      <section id="hero" style={{ position:'relative', minHeight:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Particles/>
        <div className="orb" style={{ top:'6%',  left:'10%',  width:450, height:450, background:'rgba(99,102,241,.14)' }}/>
        <div className="orb" style={{ bottom:'5%', right:'8%', width:380, height:380, background:'rgba(139,92,246,.1)', animationDelay:'-2s' }}/>
        <div className="orb" style={{ top:'42%', right:'3%',  width:270, height:270, background:'rgba(6,182,212,.07)', animationDelay:'-1s' }}/>
        <div className="orb" style={{ top:'60%', left:'5%',   width:220, height:220, background:'rgba(16,185,129,.05)', animationDelay:'-3s' }}/>

        {/* NAV */}
        <nav style={{ position:'relative', zIndex:10, padding:'18px 60px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.055)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => scrollTo('hero')}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, boxShadow:'0 0 22px rgba(99,102,241,.55)' }}>N</div>
            <span style={{ fontSize:20, fontWeight:900, letterSpacing:'-.5px' }}>NEXORA</span>
          </div>
          <div style={{ display:'flex', gap:30 }}>
            {[
              { label:'Módulos',         id:'modulos' },
              { label:'Demo',            id:'demo' },
              { label:'Características', id:'caracteristicas' },
              { label:'Contacto',        id:'contacto' },
            ].map(l => (
              <a key={l.id} href="#" className="navlink" onClick={e => { e.preventDefault(); scrollTo(l.id) }}>{l.label}</a>
            ))}
          </div>
          <button className="gbtn" style={{ padding:'10px 22px', fontSize:14 }} onClick={() => scrollTo('contacto')}>
            Solicitar Demo
          </button>
        </nav>

        {/* HERO CONTENT */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'60px 40px', position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.3)', borderRadius:20, padding:'5px 15px', marginBottom:26, fontSize:13, color:'#a5b4fc', animation:'fadein .9s ease both' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', display:'inline-block', boxShadow:'0 0 8px #10b981' }}/>
            Sistema de Gestión de Obras · Versión 2026
          </div>

          <h1 style={{ fontSize:72, fontWeight:900, lineHeight:1.04, letterSpacing:'-2.5px', maxWidth:760, marginBottom:14, animation:'slideup .9s ease .15s both' }}>
            Gestión de obras<br/>
            <span className="gtext">sin fricción</span>
          </h1>

          <p style={{ fontSize:20, color:'rgba(255,255,255,.48)', maxWidth:540, lineHeight:1.65, marginBottom:16, animation:'slideup .9s ease .35s both', minHeight:32 }}>
            <Typewriter/>
          </p>

          <div style={{ display:'flex', gap:12, marginTop:16, animation:'slideup .9s ease .55s both', flexWrap:'wrap', justifyContent:'center' }}>
            <button className="gbtn" style={{ display:'flex', alignItems:'center', gap:8 }} onClick={() => scrollTo('demo')}>
              Ver Demo en Vivo <ArrowRight size={16} strokeWidth={2.5}/>
            </button>
            <button className="obtn" style={{ display:'flex', alignItems:'center', gap:8 }} onClick={() => scrollTo('modulos')}>
              Conocer más <ChevronRight size={16} strokeWidth={2}/>
            </button>
          </div>

          <div style={{ display:'flex', gap:52, marginTop:66, padding:'18px 44px', background:'rgba(255,255,255,.022)', border:'1px solid rgba(255,255,255,.065)', borderRadius:16, animation:'slideup .9s ease .75s both', flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { to:220, suffix:'+', label:'RQIs gestionadas' },
              { to:12,  suffix:'',  label:'Obras activas' },
              { to:38,  suffix:'+', label:'Usuarios activos' },
              { to:99,  suffix:'%', label:'Uptime garantizado' },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:34, fontWeight:900, letterSpacing:'-1.5px' }}><Counter to={s.to} suffix={s.suffix}/></div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.38)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MODULES ══ */}
      <section id="modulos" style={{ padding:'100px 60px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:58 }}>
          <span style={{ color:'#818cf8', fontSize:12, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase' }}>Módulos del Sistema</span>
          <h2 style={{ fontSize:48, fontWeight:900, marginTop:10, marginBottom:14, letterSpacing:'-1.8px' }}>
            Todo integrado,<br/>todo en tiempo real
          </h2>
          <p style={{ color:'rgba(255,255,255,.42)', fontSize:17, maxWidth:480, margin:'0 auto', lineHeight:1.65 }}>
            Cada módulo funciona de forma independiente y completamente sincronizado con el resto del sistema.
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, maxWidth:1080, margin:'0 auto' }}>
          {MODULES.map((m,i) => (
            <div key={i} className="glass reveal" style={{ borderRadius:16, padding:26 }}>
              <div style={{ width:52, height:52, borderRadius:13, marginBottom:14, background:`${m.color}18`, border:`1px solid ${m.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <m.Icon size={24} color={m.color} strokeWidth={1.7}/>
              </div>
              <h3 style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>{m.title}</h3>
              <p style={{ color:'rgba(255,255,255,.42)', fontSize:13, lineHeight:1.65, marginBottom:14 }}>{m.desc}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {m.feats.map((f,j) => (
                  <div key={j} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(255,255,255,.52)' }}>
                    <ChevronRight size={12} color={m.color} strokeWidth={2.5}/>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ LIVE DEMO ══ */}
      <section id="demo" style={{ padding:'80px 60px', background:'rgba(255,255,255,.012)' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:46 }}>
          <span style={{ color:'#22d3ee', fontSize:12, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase' }}>Demo Interactivo</span>
          <h2 style={{ fontSize:48, fontWeight:900, marginTop:10, marginBottom:14, letterSpacing:'-1.8px' }}>Miralo en acción</h2>
          <p style={{ color:'rgba(255,255,255,.42)', fontSize:17, maxWidth:460, margin:'0 auto' }}>
            Datos de ejemplo reales del sistema. Explorá cada módulo.
          </p>
        </div>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:7, marginBottom:18, justifyContent:'center', flexWrap:'wrap' }}>
            {[
              { id:'pedidos',   label:'Pedidos Kanban', Icon:Package },
              { id:'logistica', label:'Logística',       Icon:Truck },
              { id:'reportes',  label:'Reportes',        Icon:TrendingUp },
              { id:'stock',     label:'Stock',           Icon:BarChart2 },
            ].map(t => (
              <button key={t.id} className={`tab${tab===t.id?' on':''}`} onClick={() => setTab(t.id)}
                style={{ display:'flex', alignItems:'center', gap:6 }}>
                <t.Icon size={13} strokeWidth={2}/>{t.label}
              </button>
            ))}
          </div>
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.065)', borderRadius:16, padding:18, minHeight:300 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              <span style={{ width:9, height:9, borderRadius:'50%', background:'#ef4444', display:'block' }}/>
              <span style={{ width:9, height:9, borderRadius:'50%', background:'#f59e0b', display:'block' }}/>
              <span style={{ width:9, height:9, borderRadius:'50%', background:'#10b981', display:'block' }}/>
              <span style={{ color:'rgba(255,255,255,.2)', fontSize:12, marginLeft:8 }}>nexora.app / {tab}</span>
            </div>
            {DEMOS[tab]}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ padding:'100px 60px' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:58 }}>
          <span style={{ color:'#34d399', fontSize:12, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase' }}>¿Cómo funciona?</span>
          <h2 style={{ fontSize:48, fontWeight:900, marginTop:10, letterSpacing:'-1.8px' }}>Flujo simple, resultado poderoso</h2>
        </div>
        <div style={{ display:'flex', maxWidth:900, margin:'0 auto' }}>
          {[
            { n:'01', Icon:PenLine,      color:'#6366f1', title:'Creación del RQI', desc:'El solicitante genera la requisición con detalle de materiales, obra e imputación contable.' },
            { n:'02', Icon:CheckCircle2, color:'#8b5cf6', title:'Flujo de aprobación', desc:'El pedido avanza: Compras → Logística → Entrega con notificaciones automáticas.' },
            { n:'03', Icon:Navigation,   color:'#06b6d4', title:'Logística y entrega', desc:'Se asigna vehículo y responsable. El estado se actualiza en tiempo real hasta la entrega.' },
            { n:'04', Icon:FileBarChart, color:'#10b981', title:'Cierre y reporte', desc:'El pedido se cierra con remito y monto OC, auditado para reportes ejecutivos.' },
          ].map((s,i) => (
            <div key={i} className="reveal" style={{ flex:1, padding:'0 18px', textAlign:'center', position:'relative' }}>
              {i < 3 && <div style={{ position:'absolute', top:25, left:'60%', width:'80%', height:1, background:`linear-gradient(90deg,${s.color}99,transparent)` }}/>}
              <div style={{ width:52, height:52, borderRadius:'50%', margin:'0 auto 14px', background:`${s.color}18`, border:`2px solid ${s.color}55`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 20px ${s.color}28`, position:'relative', zIndex:1 }}>
                <s.Icon size={22} color={s.color} strokeWidth={1.7}/>
              </div>
              <div style={{ color:s.color, fontSize:10, fontWeight:900, letterSpacing:2.5, marginBottom:6 }}>PASO {s.n}</div>
              <h4 style={{ fontSize:14, fontWeight:800, marginBottom:7 }}>{s.title}</h4>
              <p style={{ color:'rgba(255,255,255,.38)', fontSize:12, lineHeight:1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="caracteristicas" style={{ padding:'80px 60px', background:'rgba(255,255,255,.012)' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:52 }}>
          <span style={{ color:'#a78bfa', fontSize:12, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase' }}>Características</span>
          <h2 style={{ fontSize:48, fontWeight:900, marginTop:10, letterSpacing:'-1.8px' }}>Construido para escalar</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:1080, margin:'0 auto' }}>
          {([
            { Icon:Zap,         color:'#f59e0b', t:'Tiempo real',    d:'Actualizaciones instantáneas en tiempo real sin recargar la página.' },
            { Icon:ShieldCheck, color:'#10b981', t:'Seguro',         d:'Autenticación robusta, permisos por rol y auditoría de cada acción del usuario.' },
            { Icon:Smartphone,  color:'#06b6d4', t:'Responsivo',     d:'Funciona perfectamente en desktop y dispositivos móviles.' },
            { Icon:Cloud,       color:'#818cf8', t:'Cloud native',   d:'Infraestructura en la nube con backups automáticos y alta disponibilidad.' },
            { Icon:Bell,        color:'#f87171', t:'Notificaciones', d:'Sistema de alertas en tiempo real por módulo con historial completo.' },
            { Icon:Paperclip,   color:'#34d399', t:'Documentos',     d:'Almacenamiento centralizado para cada registro del sistema.' },
            { Icon:Search,      color:'#a78bfa', t:'Trazabilidad',   d:'Cada cambio queda registrado con usuario, fecha y detalle exacto de la acción.' },
            { Icon:Palette,     color:'#fbbf24', t:'Personalizable', d:'Obras, imputaciones, usuarios y roles completamente configurables.' },
          ] as const).map((f,i) => (
            <div key={i} className="glass reveal" style={{ borderRadius:13, padding:20 }}>
              <div style={{ marginBottom:12, width:40, height:40, borderRadius:10, background:`${f.color}15`, border:`1px solid ${f.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <f.Icon size={20} color={f.color} strokeWidth={1.7}/>
              </div>
              <h4 style={{ fontSize:14, fontWeight:800, marginBottom:6 }}>{f.t}</h4>
              <p style={{ color:'rgba(255,255,255,.38)', fontSize:12, lineHeight:1.55 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ NUMBERS ══ */}
      <section style={{ padding:'100px 60px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, maxWidth:980, margin:'0 auto' }}>
          {[
            { to:1580, prefix:'$', suffix:'k', label:'Monto gestionado este mes', color:'#818cf8' },
            { to:12,   prefix:'',  suffix:'',  label:'Obras activas en simultáneo', color:'#22d3ee' },
            { to:98,   prefix:'',  suffix:'%', label:'Satisfacción de usuarios',    color:'#34d399' },
            { to:0,    prefix:'',  suffix:'',  label:'Papel utilizado en procesos',  color:'#fbbf24' },
          ].map((s,i) => (
            <div key={i} className="glass reveal" style={{ borderRadius:16, padding:'28px 18px', textAlign:'center' }}>
              <div style={{ fontSize:42, fontWeight:900, letterSpacing:'-2px', color:s.color }}><Counter to={s.to} prefix={s.prefix} suffix={s.suffix}/></div>
              <div style={{ color:'rgba(255,255,255,.8)', fontSize:13, fontWeight:600, marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CTA / CONTACTO ══ */}
      <section id="contacto" style={{ padding:'100px 60px', position:'relative', overflow:'hidden' }}>
        <div className="orb" style={{ top:'15%',   left:'22%',  width:520, height:320, background:'rgba(99,102,241,.1)' }}/>
        <div className="orb" style={{ bottom:'8%', right:'18%', width:420, height:260, background:'rgba(139,92,246,.08)', animationDelay:'-1.5s' }}/>
        <div className="reveal" style={{ maxWidth:720, margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
          <h2 style={{ fontSize:54, fontWeight:900, marginBottom:18, letterSpacing:'-2px' }}>
            ¿Listo para digitalizar<br/><span className="gtext">tu obra?</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,.48)', fontSize:18, marginBottom:44, lineHeight:1.65 }}>
            Nexora está diseñado para constructoras argentinas. Implementación rápida, capacitación incluida y soporte local.
          </p>

          {/* BOTONES DE CONTACTO */}
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:36 }}>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer"
              className="gbtn"
              style={{ padding:'15px 32px', fontSize:15, display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none',
                       background:'linear-gradient(135deg,#25d366,#128c7e)', boxShadow:'0 0 28px rgba(37,211,102,.4)' }}>
              <MessageCircle size={18} strokeWidth={2}/> Escribir por WhatsApp
            </a>
            <a href={TEL_URL}
              className="obtn"
              style={{ padding:'15px 32px', fontSize:15, display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none' }}>
              <Phone size={17} strokeWidth={2}/> Llamar ahora
            </a>
          </div>

          {/* TELÉFONO VISIBLE */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'12px 24px', marginBottom:36 }}>
            <Phone size={16} color='#a5b4fc' strokeWidth={2}/>
            <span style={{ fontSize:18, fontWeight:700, letterSpacing:.5 }}>{PHONE_DISP}</span>
          </div>

          <div style={{ display:'flex', gap:28, justifyContent:'center', flexWrap:'wrap' }}>
            {['Sin costo de setup','Capacitación incluida','Soporte local'].map(f => (
              <span key={f} style={{ color:'rgba(255,255,255,.4)', fontSize:14, display:'inline-flex', alignItems:'center', gap:6 }}>
                <CheckCircle2 size={14} color='#34d399' strokeWidth={2}/>{f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ padding:'28px 60px', borderTop:'1px solid rgba(255,255,255,.055)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => scrollTo('hero')}>
          <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900 }}>N</div>
          <span style={{ fontSize:14, fontWeight:800, opacity:.55 }}>NEXORA</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, color:'rgba(255,255,255,.35)', fontSize:12 }}>
          <Phone size={12} strokeWidth={2}/>
          <a href={TEL_URL} style={{ color:'rgba(255,255,255,.35)', textDecoration:'none' }}>{PHONE_DISP}</a>
          <span style={{ opacity:.4 }}>·</span>
          <MessageCircle size={12} strokeWidth={2}/>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ color:'rgba(255,255,255,.35)', textDecoration:'none' }}>WhatsApp</a>
        </div>
        <span style={{ color:'rgba(255,255,255,.18)', fontSize:12 }}>© 2026 Nexora · Sistema de Gestión de Obras</span>
        <div style={{ display:'flex', gap:18 }}>
          <a href="#" className="navlink" style={{ fontSize:12 }} onClick={e => { e.preventDefault(); scrollTo('modulos') }}>Módulos</a>
          <a href="#" className="navlink" style={{ fontSize:12 }} onClick={e => { e.preventDefault(); scrollTo('demo') }}>Demo</a>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="navlink" style={{ fontSize:12 }}>Soporte</a>
        </div>
      </footer>
    </div>
  )
}
