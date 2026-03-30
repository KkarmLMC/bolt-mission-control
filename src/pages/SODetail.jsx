import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Receipt, Buildings, MapPin, Phone, Envelope,
  CalendarBlank, CheckCircle, PaperPlaneTilt,
  Clock, CaretDown, ArrowRight, Lightning, ClipboardText,
  Truck, ArrowSquareOut, Warning, X, PencilSimple, Prohibit, ArrowCounterClockwise } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.jsx'
import { soStatus } from '../lib/statusColors.js'
import { logActivity } from '../lib/logActivity.js'

const APP_SOURCE = (import.meta.env.VITE_APP_NAME || 'lmc_platform').toLowerCase().replace(/ /g, '_')

// Local icon map — color/bg come from soStatus() in statusColors.js
const SO_STATUS_ICON = {
  draft: Clock, queued: Clock, running: PaperPlaneTilt, submitted: PaperPlaneTilt,
  fulfillment: Receipt, published: Receipt, shipment: Truck,
  back_ordered: Warning, complete: CheckCircle, fulfilled: CheckCircle, cancelled: X }

const WIQ_URL = 'https://warehouse-iq.vercel.app'

const ACTIONS = {
  draft: {
    primary: { label: 'Submit to Queue', icon: ArrowRight, color: 'var(--navy)',
      action: async (id, navigate, setPo) => {
        await db.from('sales_orders').update({ status: 'queued', queued_at: new Date().toISOString() }).eq('id', id)
        setPo(p => ({ ...p, status: 'queued', queued_at: new Date().toISOString() }))
      }},
    hint: 'Submit to send this SO to the Warehouse IQ fulfillment queue.'
  },
  queued: {
    primary: { label: 'Start Sales Order', icon: ArrowSquareOut, color: 'var(--navy)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/queue/${id}`, '_blank') },
    hint: 'Opens Warehouse IQ to run inventory allocation and push to fulfillment.'
  },
  running: {
    primary: { label: 'View in Warehouse IQ', icon: ArrowSquareOut, color: 'var(--navy)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/queue/${id}`, '_blank') },
    hint: 'This order is currently being processed in Warehouse IQ.'
  },
  fulfillment: {
    primary: { label: 'View Fulfillment', icon: ArrowSquareOut, color: 'var(--blue)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/fulfillment/${id}`, '_blank') },
    hint: 'Warehouse team is picking and packing this order.'
  },
  shipment: {
    primary: { label: 'View Shipment', icon: ArrowSquareOut, color: 'var(--blue)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/shipment/${id}`, '_blank') },
    hint: 'Order is packed and ready to ship. Carrier and tracking will be set in Warehouse IQ.'
  },
  back_ordered: {
    primary: { label: 'Re-run Back Order', icon: ArrowSquareOut, color: 'var(--warning-text)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/queue/${id}`, '_blank') },
    hint: 'First shipment sent. Remaining back-ordered items can be re-run in Warehouse IQ once stock arrives.'
  },
  complete:    { hint: 'This order has been fully shipped and completed.' },
  fulfilled:   { hint: 'This order has been fully shipped and completed.' },
  cancelled:   { hint: 'This order has been cancelled.' },
  submitted:   {
    primary: { label: 'Open in Warehouse IQ', icon: ArrowSquareOut, color: 'var(--navy)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/queue/${id}`, '_blank') },
    hint: 'Order submitted — open Warehouse IQ to process.'
  },
  published:   {
    primary: { label: 'View Fulfillment', icon: ArrowSquareOut, color: 'var(--blue)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/fulfillment/${id}`, '_blank') },
    hint: 'Order in fulfillment.'
  },
}

// Statuses where cancellation is allowed (anything before the order leaves the building)
const CANCELLABLE = ['draft', 'queued', 'running', 'submitted', 'fulfillment', 'published', 'shipment', 'back_ordered']

function SectionGroup({ label, items }) {
  const [open, setOpen] = useState(true)
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_cost), 0)

  return (
    <div style={{ marginBottom: 'var(--mar-m)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--pad-s) var(--pad-l)', background: 'var(--navy)', cursor: 'pointer' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#fff' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-m)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
            ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <CaretDown size={13} style={{ color: 'rgba(255,255,255,0.5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </button>
      {open && items.map((item, idx) => (
        <div key={item.id} style={{
          display: 'grid',
          gridTemplateColumns: '1fr 40px 56px 64px',
          gap: 6,
          padding: 'var(--pad-s) var(--pad-m)',
          borderBottom: idx < items.length - 1 ? '1px solid var(--border-l)' : 'none',
          alignItems: 'start',
          background: 'var(--white)' }}>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            {item.sku && <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--mono)', color: 'var(--text-3)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sku}</div>}
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--black)', lineHeight: 1.4 }}>{item.description}</div>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', textAlign: 'right', paddingTop: 2 }}>{item.quantity}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', textAlign: 'right', paddingTop: 2 }}>${item.unit_cost.toFixed(2)}</div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--black)', textAlign: 'right', paddingTop: 2 }}>
            ${(item.quantity * item.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SODetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [po, setPo] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState(null)

  const canCancel = po && CANCELLABLE.includes(po.status) && ['admin', 'manager'].includes(profile?.role)

  const handleCancel = async () => {
    if (!cancelReason.trim()) return
    setCancelling(true)
    try {
      const { data, error } = await db.rpc('cancel_sales_order', {
        p_so_id: id,
        p_cancelled_by: profile?.full_name || profile?.email || 'Unknown',
        p_cancel_reason: cancelReason.trim(),
      })
      if (error) throw error
      if (data?.success) {
        logActivity(db, user?.id, APP_SOURCE, {
          category: 'sales_order', action: 'cancelled',
          label: `Cancelled ${po?.so_number || id}: ${cancelReason.trim()}`,
          entity_type: 'sales_order', entity_id: id,
          meta: { so_number: po?.so_number, reason: cancelReason.trim(), reversed_items: data.reversed_items } })
        setCancelResult(data)
        // Update local state after a moment so user sees the result
        setTimeout(() => { navigate('/sales-orders') }, 2500)
      } else {
        setCancelResult({ success: false, error: data?.error || 'Unknown error' })
      }
    } catch (err) {
      setCancelResult({ success: false, error: err.message })
    } finally {
      setCancelling(false)
    }
  }

  const load = () => Promise.all([
    db.from('sales_orders').select('*').eq('id', id).single(),
    db.from('so_line_items').select('*, parts(sku, name), warehouses(name)').eq('so_id', id).order('sort_order'),
  ]).then(([{ data: poData }, { data: lineData }]) => {
    setPo(poData)
    setLines(lineData || [])
    setLoading(false)
  })

  useEffect(() => { load() }, [id])

  if (loading) return <div className="page-content fade-in" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--pad-xxl)' }}><div className="spinner" /></div>
  if (!po) return <div className="page-content fade-in"><div className="empty"><div className="empty-title">Sales Order not found</div></div></div>

  const statusDisplay = soStatus(po.status)
  const actionCfg = ACTIONS[po.status] || {}
  const materialLines = lines.filter(l => l.line_type === 'material')
  const laborLines = lines.filter(l => l.line_type === 'labor')
  const materialsTotal = materialLines.reduce((s, l) => s + (l.quantity * l.unit_cost), 0)
  const laborTotal = laborLines.reduce((s, l) => s + (l.quantity * l.unit_cost), 0)
  const grandTotal = materialsTotal + laborTotal

  const sections = []
  const seen = new Set()
  for (const line of materialLines) {
    const sec = line.section_label || 'General'
    if (!seen.has(sec)) { seen.add(sec); sections.push(sec) }
  }

  const warehouseImpact = {}
  for (const line of materialLines.filter(l => l.warehouse_id)) {
    const wName = line.warehouses?.name || 'Unknown'
    if (!warehouseImpact[wName]) warehouseImpact[wName] = { parts: 0, qty: 0 }
    warehouseImpact[wName].parts += 1
    warehouseImpact[wName].qty += line.quantity
  }

  const StatusIcon = SO_STATUS_ICON[po.status] || SO_STATUS_ICON[order?.status] || CheckCircle

  const handleAction = async (actionFn, actionLabel) => {
    if (!actionFn || acting) return
    const prevStatus = po?.status
    setActing(true)
    try {
      await actionFn(id, navigate, setPo)
      // Log if the action caused a local state change (DB-modifying action vs external link)
      if (po?.status !== prevStatus || actionLabel) {
        logActivity(db, user?.id, APP_SOURCE, {
          category: 'sales_order', action: 'status_changed',
          label: actionLabel || `${po?.so_number || id}: ${prevStatus} → action taken`,
          entity_type: 'sales_order', entity_id: id,
          meta: { prev_status: prevStatus, so_number: po?.so_number } })
      }
    } finally { setActing(false) }
  }

  return (
    <div className="page-content fade-in">

      {/* SO Header card */}
      <div style={{ background: 'var(--navy)', borderRadius: 'var(--r-m)', padding: 'var(--pad-xl)', marginBottom: 'var(--mar-l)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--mar-m)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              {po.division === 'Bolt' ? 'Bolt Lightning' : 'Lightning Master'} · {po.so_number}
            </div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, lineHeight: 1.1 }}>{po.customer_name}</div>
            {po.project_name && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{po.project_name}</div>
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', borderRadius: 'var(--r-s)',
            background: statusDisplay.bg, color: statusDisplay.color }}>
            <StatusIcon size={12} weight="fill" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{statusDisplay.label}</span>
          </div>
        </div>

        {/* Customer details */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gap-l)', paddingTop: 'var(--pad-m)' }}>
          {(po.customer_city || po.customer_state) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)' }}>
              <MapPin size={12} />
              {[po.customer_city, po.customer_state].filter(Boolean).join(', ')}
            </div>
          )}
          {po.customer_phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)' }}>
              <Phone size={12} /> {po.customer_phone}
            </div>
          )}
          {po.customer_email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)' }}>
              <Envelope size={12} /> {po.customer_email}
            </div>
          )}
          {po.so_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)' }}>
              <CalendarBlank size={12} />
              {new Date(po.so_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          {po.job_reference && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--mono)' }}>
              Ref: {po.job_reference}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTEXTUAL ACTION BAR ──────────────────────────────────────────── */}
      {(actionCfg.primary || actionCfg.hint) && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', padding: 'var(--pad-l)', marginBottom: 'var(--mar-l)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', marginBottom: actionCfg.hint ? 'var(--mar-s)' : 0 }}>
            Next Action
          </div>
          {actionCfg.hint && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: actionCfg.primary ? 'var(--mar-m)' : 0, lineHeight: 1.6 }}>
              {actionCfg.hint}
            </div>
          )}
          {(actionCfg.primary || canCancel) && (
            <div style={{ display: 'flex', gap: 'var(--gap-m)', flexWrap: 'wrap', alignItems: 'center' }}>
              {actionCfg.primary && (() => {
                const { label, icon: Icon, color, action } = actionCfg.primary
                return (
                  <button
                    onClick={() => handleAction(action)}
                    disabled={acting}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-s)', padding: 'var(--pad-s) var(--pad-l)', borderRadius: 'var(--r-m)', background: color, color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1 }}>
                    {acting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Icon size={15} weight="bold" />}
                    {label}
                  </button>
                )
              })()}
              {canCancel && (
                <button
                  onClick={() => setCancelModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-s)', padding: 'var(--pad-s) var(--pad-l)', borderRadius: 'var(--r-m)', background: 'none', color: 'var(--error)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
                  <Prohibit size={14} />
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inventory impact */}
      {!['complete','fulfilled','cancelled'].includes(po.status) && Object.keys(warehouseImpact).length > 0 && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', padding: 'var(--pad-l)', marginBottom: 'var(--mar-l)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', marginBottom: 'var(--mar-m)' }}>
            Inventory Impact {['fulfillment','shipment','complete','fulfilled'].includes(po.status) ? '(Applied)' : '(On Fulfillment)'}
          </div>
          {Object.entries(warehouseImpact).map(([wName, impact]) => (
            <div key={wName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--mar-s)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-s)', fontSize: 'var(--text-sm)' }}>
                <Buildings size={14} style={{ color: 'var(--black)' }} />
                {wName}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--error-dark)', background: 'var(--error-soft)', padding: '2px 8px', borderRadius: 'var(--r-s)' }}>
                -{impact.qty} units ({impact.parts} SKUs)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Line items — materials by section */}
      {sections.length > 0 && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', overflow: 'hidden', marginBottom: 'var(--mar-l)', maxWidth: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 56px 64px', gap: 6, padding: 'var(--pad-s) var(--pad-m)', background: 'var(--hover)', borderBottom: '1px solid var(--border-l)' }}>
            {['Item / Description', 'Qty', 'Unit', 'Amount'].map(h => (
              <div key={h} style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', textAlign: h !== 'Item / Description' ? 'right' : 'left', whiteSpace: 'nowrap', overflow: 'hidden' }}>{h}</div>
            ))}
          </div>
          {sections.map(sec => (
            <SectionGroup
              key={sec}
              label={sec}
              items={materialLines.filter(l => (l.section_label || 'General') === sec)}
            />
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--pad-m) var(--pad-l)', borderTop: '2px solid var(--border-l)', background: 'var(--hover)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>Materials Subtotal</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>
              ${materialsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Labor lines */}
      {laborLines.length > 0 && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', overflow: 'hidden', marginBottom: 'var(--mar-l)', maxWidth: '100%' }}>
          <div style={{ padding: 'var(--pad-m) var(--pad-l)', background: 'var(--navy)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#fff' }}>Installation / Labor</span>
          </div>
          {laborLines.map((line, idx) => (
            <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 'var(--gap-m)', padding: 'var(--pad-m) var(--pad-l)', borderBottom: idx < laborLines.length - 1 ? '1px solid var(--border-l)' : 'none', alignItems: 'center', background: 'var(--white)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{line.description}</div>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', textAlign: 'right' }}>{line.quantity}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', textAlign: 'right' }}>${line.unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textAlign: 'right' }}>${(line.quantity * line.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--pad-m) var(--pad-l)', borderTop: '2px solid var(--border-l)', background: 'var(--hover)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>Labor Subtotal</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>${laborTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Grand total */}
      {grandTotal > 0 && (
        <div style={{ background: 'var(--navy)', borderRadius: 'var(--r-m)', padding: 'var(--pad-l) var(--pad-xl)', marginBottom: 'var(--mar-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#fff' }}>Total</span>
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: '#fff' }}>
            ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Notes */}
      {po.notes && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', padding: 'var(--pad-l)', marginBottom: 'var(--mar-l)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', marginBottom: 'var(--mar-s)' }}>Notes</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--black)', lineHeight: 1.6 }}>{po.notes}</div>
        </div>
      )}

      {/* ── CANCELLED BANNER ──────────────────────────────────────────────── */}
      {po.status === 'cancelled' && (po.cancelled_at || po.cancel_reason) && (
        <div style={{ background: 'var(--error-soft)', borderRadius: 'var(--r-m)', padding: 'var(--pad-l)', marginBottom: 'var(--mar-l)', border: '1px solid var(--error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-s)', marginBottom: 'var(--mar-s)' }}>
            <Prohibit size={16} style={{ color: 'var(--error)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--error-dark)' }}>Order Cancelled</span>
          </div>
          {po.cancel_reason && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--error-dark)', marginBottom: 'var(--mar-xs)', lineHeight: 1.6 }}>
              <strong>Reason:</strong> {po.cancel_reason}
            </div>
          )}
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
            {po.cancelled_by && <span>Cancelled by {po.cancelled_by}</span>}
            {po.cancelled_at && <span> · {new Date(po.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ──────────────────────────────────────────────────── */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 'var(--pad-l)' }}
          onClick={e => { if (e.target === e.currentTarget && !cancelling) setCancelModal(false) }}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>

            {/* Modal header */}
            <div style={{ background: 'var(--error)', padding: 'var(--pad-l) var(--pad-xl)', display: 'flex', alignItems: 'center', gap: 'var(--gap-m)' }}>
              <Prohibit size={20} style={{ color: '#fff' }} />
              <div>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: '#fff' }}>Cancel Sales Order</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.8)' }}>{po.so_number} · {po.customer_name}</div>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: 'var(--pad-xl)' }}>
              {!cancelResult ? (
                <>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginBottom: 'var(--mar-m)', lineHeight: 1.6 }}>
                    This will cancel the order and return all allocated inventory to stock. This action cannot be undone.
                  </div>

                  {/* What will happen summary */}
                  <div style={{ background: 'var(--hover)', borderRadius: 'var(--r-l)', padding: 'var(--pad-m)', marginBottom: 'var(--mar-l)', fontSize: 'var(--text-xs)', color: 'var(--black)', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>This will:</div>
                    <div><ArrowCounterClockwise size={12} style={{ marginRight: 4 }} /> Return all allocated inventory to stock</div>
                    <div><X size={12} style={{ marginRight: 4 }} /> Remove fulfillment sheets and pending shipments</div>
                    <div><Prohibit size={12} style={{ marginRight: 4 }} /> Mark this SO as cancelled (preserved for audit)</div>
                  </div>

                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', display: 'block', marginBottom: 6 }}>Reason for cancellation *</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="e.g., Customer requested change — will re-create with updated quantities"
                    rows={3}
                    style={{ width: '100%', resize: 'vertical', fontSize: 'var(--text-sm)' }}
                  />

                  <div style={{ display: 'flex', gap: 'var(--gap-m)', justifyContent: 'flex-end', marginTop: 'var(--mar-l)' }}>
                    <button
                      onClick={() => { setCancelModal(false); setCancelReason(''); setCancelResult(null) }}
                      disabled={cancelling}
                      style={{ padding: 'var(--pad-s) var(--pad-xl)', borderRadius: 'var(--r-m)', background: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
                      Go Back
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={!cancelReason.trim() || cancelling}
                      style={{ padding: 'var(--pad-s) var(--pad-xl)', borderRadius: 'var(--r-m)', background: !cancelReason.trim() ? 'var(--text-3)' : 'var(--error)', color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: !cancelReason.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--gap-s)' }}>
                      {cancelling ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }} /> Cancelling…</> : <><Prohibit size={14} /> Cancel Order</>}
                    </button>
                  </div>
                </>
              ) : cancelResult.success ? (
                <div style={{ textAlign: 'center', padding: 'var(--pad-l) 0' }}>
                  <CheckCircle size={44} weight="fill" style={{ color: 'var(--success)', marginBottom: 'var(--mar-m)' }} />
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: 'var(--mar-s)' }}>Order Cancelled</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', lineHeight: 1.6 }}>
                    {cancelResult.inventory_reversed > 0 && <div>{cancelResult.inventory_reversed} inventory allocation(s) returned to stock</div>}
                    {cancelResult.fulfillment_lines_deleted > 0 && <div>{cancelResult.fulfillment_lines_deleted} fulfillment line(s) removed</div>}
                    {cancelResult.shipments_deleted > 0 && <div>{cancelResult.shipments_deleted} pending shipment(s) removed</div>}
                    {cancelResult.inventory_reversed === 0 && cancelResult.fulfillment_lines_deleted === 0 && <div>No downstream data to reverse — order was cancelled cleanly.</div>}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 'var(--mar-m)' }}>Redirecting to Sales Orders…</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--pad-l) 0' }}>
                  <Warning size={44} weight="fill" style={{ color: 'var(--error)', marginBottom: 'var(--mar-m)' }} />
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: 'var(--error-dark)', marginBottom: 'var(--mar-s)' }}>Cancel Failed</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>{cancelResult.error}</div>
                  <button
                    onClick={() => setCancelResult(null)}
                    style={{ marginTop: 'var(--mar-l)', padding: 'var(--pad-s) var(--pad-xl)', borderRadius: 'var(--r-m)', background: 'var(--navy)', color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer' }}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
