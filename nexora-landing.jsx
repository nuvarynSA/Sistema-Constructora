import { useState, useEffect, useRef } from "react"
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, Tooltip, ResponsiveContainer,
} from "recharts"

/* ─────────────────── DATA ─────────────────── */
const ORDERS = [
  { id:"RQI-2026-201", obra:"Edificio Norte", estado:"Pendiente",   prio:"Alta",  monto:185000, items:"Hierros corrugados 12 mm × 500 kg" },
  { id:"RQI-2026-202", obra:"Proyecto 108",   estado:"En Proceso",  prio:"Media", monto:42500,  items:"Cerámicos 60×60 blancos × 200 m²" },
  { id:"RQI-2026-203", obra:"Poder Judicial", estado:"Aprobado",    prio:"Alta",  monto:231339, items:"Carpintería de aluminio + vidrio" },
  { id:"RQI-2026-204", obra:"Remodelación Sur",estado:"Finalizado", prio:"Baja",  monto:15600,  items:"Pintura acrílica 20 L × 50 unidades" },
  { id:"RQI-2026-205", obra:"Club Social JM", estado:"Pendiente",   prio:"Media", monto:89000,  items:"Vidrios templados 8 mm" },
  { id:"RQI-2026-206", obra:"Edificio Norte", estado:"En Proceso",  prio:"Alta",  monto:320000, items:"Cemento Portland × 500 bolsas" },
]
const TASKS = [
  { id:"TLN-001", title:"Entrega materiales Obra Norte",       vehicle:"KANGOO 1", prio:"Alta",  estado:"en_curso",  tipo:"TAREA" },
  { id:"TLN-002", title:"Retiro herramientas Proyecto 108",    vehicle:"MASTER",   prio:"Media", estado:"pendiente", tipo:"TAREA" },
  { id:"TLN-003", title:"Consulta proveedor Cerámicos S.A.",   vehicle:"",         prio:"Baja",  estado:"finalizado",tipo:"CONSULTA" },
  { id:"TLN-004", title:"Inspección depósito central",         vehicle:"ALASKAN",  prio:"Alta",  estado:"pendiente", tipo:"TAREA" },
  { id:"TLN-005", title:"Entrega carpintería Poder Judicial",  vehicle:"SAVEIRO",  prio:"Alta",  estado:"en_curso",  tipo:"TAREA" },
]
const STOCK_ITEMS = [
  { name:"Cemento Portland",    stock:245,  min:100, unit:"bolsas" },
  { name:"Hierro 12 mm",        stock:48,   min:100, unit:"barras" },
  { name:"Cerámicos 60×60",     stock:380,  min:50,  unit:"m²" },
  { name:"Pintura acrílica",    stock:92,   min:30,  unit:"litros" },
  { name:"Cable unipolar 4 mm", stock:1200, min:200, unit:"mts" },
]
const MONTHLY = [
  { mes:"Ene", pedidos:12, monto:485 },
  { mes:"Feb", pedidos:18, monto:762 },
  { mes:"Mar", pedidos:15, monto:632 },
  { mes:"Abr", pedidos:22, monto:891 },
  { mes:"May", pedidos:28, monto:1240 },
  { mes:"Jun", pedidos:31, monto:1580 },
]
const PIE_DATA = [
  { name:"Finalizado", value:45, color:"#10b981" },
  { name:"En Proceso", value:30, color:"#3b82f6" },
  { name:"Pendiente",  value:15, color:"#f59e0b" },
  { name:"Aprobado",   value:10, color:"#8b5cf6" },
]
const MODULES = [
  { icon:"📦", title:"Pedidos (RQIs)", color:"#6366f1",
    desc:"Gestión completa de solicitudes de compra con flujo Kanban, imputaciones contables y trazabilidad total.",
    feats:["Kanban multi-etapa","Imputación xxx.xxx.xxx","Notificaciones realtime","Historial de actividad"] },
  { icon:"🚛", title:"Logística", color:"#06b6d4",
    desc:"Control de tareas logísticas, asignación de vehículos y seguimiento de entregas en obra.",
    feats:["5 vehículos disponibles","Prioridades dinámicas","Comentarios + archivos","Estado en tiempo real"] },
  { icon:"📋", title:"Licitaciones", color:"#8b5cf6",
    desc:"Administración del proceso de licitación desde la creación hasta el cierre con toda su documentación.",
    feats:["Flujo de aprobación","Adjuntos ilimitados","Historial completo","Multi-área"] },
  { icon:"📊", title:"Stock", color:"#10b981",
    desc:"Control de inventario en tiempo real con alertas de stock mínimo y trazabilidad por obra.",
    feats:["Alertas automáticas","Por obra y depósito","Movimientos auditados","Reportes de stock"] },
  { icon:"📈", title:"Reportes", color:"#f59e0b",
    desc:"Dashboard ejecutivo con gráficos en tiempo real sobre pedidos, montos y performance por obra.",
    feats:["Gráficos interactivos","Exportación Excel/PDF","Filtros avanzados","KPIs por obra"] },
  { icon:"👥", title:"Usuarios y Roles", color:"#ef4444",
    desc:"Control de acceso granular con roles personalizables y auditoría completa de todas las acciones.",
    feats:["Roles y permisos","Auditoría completa","Notificaciones push","Multi-área"] },
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
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    let raf
    const pts = []
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
      ctx.clearRect(0, 0, c.width, c.height)
      for (let i = 0; i < N; i++) {
        const p = pts[i]
        p.x = (p.x + p.vx + c.width) % c.width
        p.y = (p.y + p.vy + c.height) % c.height
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
    let t
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
function Counter({ to, prefix='', suffix='' }) {
  const [v, setV] = useState(0)
  const ref = useRef(null)
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
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold:.08 }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ─────────────────── PILL ─────────────────── */
const PC = {
  Alta:  ['rgba(239,68,68,.16)','#f87171','rgba(239,68,68,.35)'],
  Media: ['rgba(245,158,11,.16)','#fbbf24','rgba(245,158,11,.35)'],
  Baja:  ['rgba(107,114,128,.15)','#9ca3af','rgba(107,114,128,.3)'],
}
function Pill({ label, c }) {
  return c ? (
    <span className="pill" style={{ background:c[0], color:c[1], border:`1px solid ${c[2]}` }}>
      {label.replace('_',' ')}
    </span>
  ) : null
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
            <span style={{ width:7, height:7, borderRadius:'50%', background:col.color, boxShadow:`0 0 7px ${col.color}`, flexShrink:0 }} />
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
                <Pill label={o.prio} c={PC[o.prio]} />
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
  const SC = { en_curso:'#3b82f6', finalizado:'#10b981', pendiente:'#f59e0b' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {TASKS.map(t => (
        <div key={t.id} style={{
          background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.065)',
          borderRadius:10, padding:'9px 13px', display:'flex', alignItems:'center', gap:11,
          transition:'border-color .2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor='rgba(6,182,212,.4)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.065)'}
        >
          <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:SC[t.estado], boxShadow:`0 0 6px ${SC[t.estado]}` }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'rgba(255,255,255,.9)', fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
            <div style={{ color:'rgba(255,255,255,.32)', fontSize:11, marginTop:2 }}>{t.id} · {t.tipo}</div>
          </div>
          {t.vehicle && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:7, background:'rgba(6,182,212,.1)', color:'#22d3ee', border:'1px solid rgba(6,182,212,.25)', fontWeight:700, whiteSpace:'nowrap' }}>
              🚛 {t.vehicle}
            </span>
          )}
          <Pill label={t.prio} c={PC[t.prio]} />
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
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={MONTHLY}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={.35}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="pedidos" stroke="#6366f1" fill="url(#ag)" strokeWidth={2} dot={false}/>
            <XAxis dataKey="mes" tick={{ fill:'rgba(255,255,255,.3)', fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background:'#111827', border:'1px solid rgba(99,102,241,.35)', borderRadius:8, fontSize:11 }}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.055)', borderRadius:12, padding:14 }}>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, marginBottom:10 }}>Estado de pedidos</p>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <PieChart width={110} height={110}>
            <Pie data={PIE_DATA} cx={50} cy={50} innerRadius={27} outerRadius={50} dataKey="value" strokeWidth={0}>
              {PIE_DATA.map((e,i) => <Cell key={i} fill={e.color}/>)}
            </Pie>
          </PieChart>
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
        <ResponsiveContainer width="100%" height={95}>
          <BarChart data={MONTHLY}>
            <Bar dataKey="monto" fill="#8b5cf6" radius={[4,4,0,0]}/>
            <XAxis dataKey="mes" tick={{ fill:'rgba(255,255,255,.3)', fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background:'#111827', border:'1px solid rgba(139,92,246,.35)', borderRadius:8, fontSize:11 }} formatter={v=>[`$${v}k`,'Monto']}/>
          </BarChart>
        </ResponsiveContainer>
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

/* ─────────────────── MAIN ─────────────────── */
export default function App() {
  const [tab, setTab] = useState('pedidos')
  useReveal()

  useEffect(() => {
    if (!document.getElementById('nx')) {
      const s = document.createElement('style')
      s.id = 'nx'; s.textContent = CSS
      document.head.appendChild(s)
    }
  }, [])

  const DEMOS = { pedidos:<PedidosKanban/>, logistica:<LogisticaList/>, reportes:<ReportesCharts/>, stock:<StockTable/> }

  return (
    <div style={{ background:'#040610', color:'#fff', fontFamily:"'Inter',system-ui,sans-serif", minHeight:'100vh', overflowX:'hidden' }}>

      {/* ══ HERO ══ */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Particles/>
        <div className="orb" style={{ top:'6%',  left:'10%',  width:450, height:450, background:'rgba(99,102,241,.14)' }}/>
        <div className="orb" style={{ bottom:'5%', right:'8%',  width:380, height:380, background:'rgba(139,92,246,.1)', animationDelay:'-2s' }}/>
        <div className="orb" style={{ top:'42%', right:'3%',  width:270, height:270, background:'rgba(6,182,212,.07)', animationDelay:'-1s' }}/>
        <div className="orb" style={{ top:'60%', left:'5%',   width:220, height:220, background:'rgba(16,185,129,.05)', animationDelay:'-3s' }}/>

        {/* NAV */}
        <nav style={{ position:'relative', zIndex:10, padding:'18px 60px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,.055)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, boxShadow:'0 0 22px rgba(99,102,241,.55)' }}>N</div>
            <span style={{ fontSize:20, fontWeight:900, letterSpacing:'-.5px' }}>NEXORA</span>
          </div>
          <div style={{ display:'flex', gap:30 }}>
            {['Módulos','Demo','Características','Contacto'].map(l => (
              <a key={l} href="#" className="navlink">{l}</a>
            ))}
          </div>
          <button className="gbtn" style={{ padding:'10px 22px', fontSize:14 }}>Solicitar Demo</button>
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
            <button className="gbtn">Ver Demo en Vivo →</button>
            <button className="obtn">Conocer más</button>
          </div>

          {/* STATS BAR */}
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
      <section style={{ padding:'100px 60px' }}>
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
              <div style={{ width:52, height:52, borderRadius:13, marginBottom:14, fontSize:26, background:`${m.color}18`, border:`1px solid ${m.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {m.icon}
              </div>
              <h3 style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>{m.title}</h3>
              <p style={{ color:'rgba(255,255,255,.42)', fontSize:13, lineHeight:1.65, marginBottom:14 }}>{m.desc}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {m.feats.map((f,j) => (
                  <div key={j} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(255,255,255,.52)' }}>
                    <span style={{ color:m.color, fontSize:9 }}>◆</span>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ LIVE DEMO ══ */}
      <section style={{ padding:'80px 60px', background:'rgba(255,255,255,.012)' }}>
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
              { id:'pedidos',   label:'📦 Pedidos Kanban' },
              { id:'logistica', label:'🚛 Logística' },
              { id:'reportes',  label:'📈 Reportes' },
              { id:'stock',     label:'📊 Stock' },
            ].map(t => (
              <button key={t.id} className={`tab${tab===t.id?' on':''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.065)', borderRadius:16, padding:18, minHeight:300 }}>
            {/* Browser chrome */}
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
            { n:'01', icon:'✏️', color:'#6366f1', title:'Creación del RQI', desc:'El solicitante genera la requisición con detalle de materiales, obra e imputación contable.' },
            { n:'02', icon:'⚡', color:'#8b5cf6', title:'Flujo de aprobación', desc:'El pedido avanza: Compras → Logística → Entrega con notificaciones automáticas.' },
            { n:'03', icon:'🚛', color:'#06b6d4', title:'Logística y entrega', desc:'Se asigna vehículo y responsable. El estado se actualiza en tiempo real hasta la entrega.' },
            { n:'04', icon:'📊', color:'#10b981', title:'Cierre y reporte', desc:'El pedido se cierra con remito y monto OC, auditado para reportes ejecutivos.' },
          ].map((s,i) => (
            <div key={i} className="reveal" style={{ flex:1, padding:'0 18px', textAlign:'center', position:'relative' }}>
              {i < 3 && <div style={{ position:'absolute', top:25, left:'60%', width:'80%', height:1, background:`linear-gradient(90deg,${s.color}99,transparent)` }}/>}
              <div style={{ width:52, height:52, borderRadius:'50%', margin:'0 auto 14px', background:`${s.color}18`, border:`2px solid ${s.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:`0 0 20px ${s.color}28`, position:'relative', zIndex:1 }}>
                {s.icon}
              </div>
              <div style={{ color:s.color, fontSize:10, fontWeight:900, letterSpacing:2.5, marginBottom:6 }}>PASO {s.n}</div>
              <h4 style={{ fontSize:14, fontWeight:800, marginBottom:7 }}>{s.title}</h4>
              <p style={{ color:'rgba(255,255,255,.38)', fontSize:12, lineHeight:1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section style={{ padding:'80px 60px', background:'rgba(255,255,255,.012)' }}>
        <div className="reveal" style={{ textAlign:'center', marginBottom:52 }}>
          <span style={{ color:'#a78bfa', fontSize:12, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase' }}>Características</span>
          <h2 style={{ fontSize:48, fontWeight:900, marginTop:10, letterSpacing:'-1.8px' }}>Construido para escalar</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:1080, margin:'0 auto' }}>
          {[
            { e:'⚡', t:'Tiempo real',      d:'Actualizaciones instantáneas con tiempo real sin recargar la página.' },
            { e:'🔐', t:'Seguro',           d:'Autenticación robusta, RLS en base de datos y auditoría de cada acción del usuario.' },
            { e:'📱', t:'Responsivo',       d:'Funciona perfectamente en desktop y dispositivos móviles.' },
            { e:'☁️', t:'Cloud native',     d:'Infraestructura en la nube con backups automáticos y alta disponibilidad.' },
            { e:'🔔', t:'Notificaciones',   d:'Sistema de alertas en tiempo real por módulo con historial completo.' },
            { e:'📎', t:'Documentos',       d:'Almacenamiento ilimitado en Cloudflare R2 para cada registro del sistema.' },
            { e:'🔍', t:'Trazabilidad',     d:'Cada cambio queda registrado con usuario, fecha y detalle exacto de la acción.' },
            { e:'🎨', t:'Personalizable',   d:'Obras, imputaciones, usuarios y roles completamente configurables.' },
          ].map((f,i) => (
            <div key={i} className="glass reveal" style={{ borderRadius:13, padding:20 }}>
              <div style={{ fontSize:26, marginBottom:9 }}>{f.e}</div>
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

      {/* ══ CTA ══ */}
      <section style={{ padding:'100px 60px', position:'relative', overflow:'hidden' }}>
        <div className="orb" style={{ top:'15%', left:'22%', width:520, height:320, background:'rgba(99,102,241,.1)' }}/>
        <div className="orb" style={{ bottom:'8%', right:'18%', width:420, height:260, background:'rgba(139,92,246,.08)', animationDelay:'-1.5s' }}/>
        <div className="reveal" style={{ maxWidth:680, margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
          <h2 style={{ fontSize:54, fontWeight:900, marginBottom:18, letterSpacing:'-2px' }}>
            ¿Listo para digitalizar<br/><span className="gtext">tu obra?</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,.48)', fontSize:18, marginBottom:38, lineHeight:1.65 }}>
            Nexora está diseñado para constructoras argentinas. Implementación rápida, capacitación incluida y soporte local.
          </p>
          <div style={{ marginBottom:30 }}>
            <button className="gbtn" style={{ padding:'15px 40px', fontSize:16 }}>
              ✉️ Solicitar Demo Personalizada
            </button>
          </div>
          <div style={{ display:'flex', gap:28, justifyContent:'center', flexWrap:'wrap' }}>
            {['✓ Sin costo de setup','✓ Capacitación incluida','✓ Soporte local'].map(f => (
              <span key={f} style={{ color:'rgba(255,255,255,.4)', fontSize:14 }}>{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ padding:'24px 60px', borderTop:'1px solid rgba(255,255,255,.055)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900 }}>N</div>
          <span style={{ fontSize:14, fontWeight:800, opacity:.55 }}>NEXORA</span>
        </div>
        <span style={{ color:'rgba(255,255,255,.22)', fontSize:12 }}>© 2026 Nexora · Sistema de Gestión de Obras</span>
        <div style={{ display:'flex', gap:18 }}>
          {['Privacidad','Términos','Soporte'].map(l => (
            <a key={l} href="#" className="navlink" style={{ fontSize:12 }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
