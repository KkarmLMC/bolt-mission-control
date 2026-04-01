import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Receipt, Buildings, MapPin, Phone, Envelope,
  CalendarBlank, CheckCircle, PaperPlaneTilt,
  Clock, ArrowRight, Lightning, ClipboardText,
  Truck, ArrowSquareOut, Warning, X, PencilSimple, Prohibit, ArrowCounterClockwise,
  AirplaneTilt } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.jsx'
import { soStatus } from '../lib/statusColors.js'
import { logActivity } from '../lib/logActivity.js'
import { Card, Button, Badge } from '../components/ui'

const APP_SOURCE = (import.meta.env.VITE_APP_NAME || 'lmc_platform').toLowerCase().replace(/ /g, '_')

// Local icon map — color/bg come from soStatus() in statusColors.js
const SO_STATUS_ICON = {
  draft: Clock, queued: Clock, running: PaperPlaneTilt, submitted: PaperPlaneTilt,
  fulfillment: Receipt, partial_fulfillment: Receipt, published: Receipt, shipment: Truck,
  partial_shipment: AirplaneTilt, back_ordered: Warning, complete: CheckCircle,
  fulfilled: CheckCircle, cancelled: X }

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
  partial_fulfillment: {
    primary: { label: 'View Fulfillment', icon: ArrowSquareOut, color: 'var(--blue)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/fulfillment/${id}`, '_blank') },
    hint: 'Warehouse lines in fulfillment. Drop ship and/or back order tracks are also active.'
  },
  partial_shipment: {
    primary: { label: 'View Drop Ship Queue', icon: ArrowSquareOut, color: 'var(--warning-text)',
      action: (id) => window.open(`${WIQ_URL}/warehouse-hq/dropship/${id}`, '_blank') },
    hint: 'Warehouse shipment sent. Drop ship from PLP and/or back order still pending.'
  },
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
const CANCELLABLE = ['draft', 'queued', 'running', 'submitted', 'fulfillment', 'partial_fulfillment', 'published', 'shipment', 'partial_shipment', 'back_ordered']

function SectionGroup({ label, items }) {
  const [open, setOpen] = useState(true)
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_cost), 0)

  return (
    <div className="line-item">
      <button onClick={() => setOpen(o => !o)} className="line-item__header">
        <span className="line-item__label">{label}</span>
        <span />
        <span />
        <span className="line-item__total">
          ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </button>
      {open && items.map((item, idx) => (
        <div key={item.id} className="line-item__row" style={{ borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div className="line-item__description">
            {item.sku && <div className="line-item__sku">{item.sku}</div>}
            <div className="line-item__name">{item.description}</div>
          </div>
          <div className="line-item__cell">{item.quantity}</div>
          <div className="line-item__cell">${item.unit_cost.toFixed(2)}</div>
          <div className="line-item__cell">
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

  const load = () => {
    const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
    return Promise.race([
      Promise.all([
        db.from('sales_orders').select('*').eq('id', id).maybeSingle(),
        db.from('so_line_items').select('*, parts(sku, name), warehouses(name)').eq('so_id', id).order('sort_order'),
      ]),
      timeout(5000),
    ]).then(([{ data: poData }, { data: lineData }]) => {
      setPo(poData)
      setLines(lineData || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="page-content fade-in spinner-pad"><div className="spinner" /></div>
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
      <div className="so-detail-header">
        <div className="so-detail-header__top">
          <div>
            <div className="s-o-detail-e408">
              {po.division === 'Bolt' ? 'Bolt Lightning' : 'Lightning Master'} · {po.so_number}
            </div>
            <div className="so-detail-header__title">{po.customer_name}</div>
            {po.project_name && (
              <div className="so-detail-header__meta">{po.project_name}</div>
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 12px', borderRadius: 'var(--radius-s)',
            background: statusDisplay.bg, color: statusDisplay.color }}>
            <StatusIcon size="0.75rem" weight="fill" />
            <span className="text-label">{statusDisplay.label}</span>
          </div>
        </div>

        {/* Customer details */}
        <div className="s-o-detail-81a6">
          {(po.customer_city || po.customer_state) && (
            <div className="s-o-detail-cf29">
              <MapPin size="0.75rem" />
              {[po.customer_city, po.customer_state].filter(Boolean).join(', ')}
            </div>
          )}
          {po.customer_phone && (
            <div className="s-o-detail-cf29">
              <Phone size="0.75rem" /> {po.customer_phone}
            </div>
          )}
          {po.customer_email && (
            <div className="s-o-detail-cf29">
              <Envelope size="0.75rem" /> {po.customer_email}
            </div>
          )}
          {po.so_date && (
            <div className="s-o-detail-cf29">
              <CalendarBlank size="0.75rem" />
              {new Date(po.so_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          {po.job_reference && (
            <div className="s-o-detail-4447">
              Ref: {po.job_reference}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTEXTUAL ACTION BAR ──────────────────────────────────────────── */}
      {(actionCfg.primary || actionCfg.hint) && (
        <div className="card-section">
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: actionCfg.hint ? 'var(--space-s)' : 0 }}>
            Next Action
          </div>
          {actionCfg.hint && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: actionCfg.primary ? 'var(--space-m)' : 0, lineHeight: 1.6 }}>
              {actionCfg.hint}
            </div>
          )}
          {(actionCfg.primary || canCancel) && (
            <div className="s-o-detail-da4d">
              {actionCfg.primary && (() => {
                const { label, icon: Icon, color, action } = actionCfg.primary
                return (
                  <button
                    onClick={() => handleAction(action)}
                    disabled={acting}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', padding: 'var(--space-s) var(--space-l)', borderRadius: 'var(--radius-m)', background: color, color: '#fff', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1 }}>
                    {acting ? <div className="spinner s-o-detail-2ee7" /> : <Icon size="0.9375rem" weight="bold" />}
                    {label}
                  </button>
                )
              })()}
              {canCancel && (
                <button
                  onClick={() => setCancelModal(true)}
                  className="s-o-detail-bad5">
                  <Prohibit size="0.875rem" />
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inventory impact */}
      {!['complete','fulfilled','cancelled'].includes(po.status) && Object.keys(warehouseImpact).length > 0 && (
        <div className="so-detail__inventory-impact">
          <div className="so-detail__inventory-impact-title">
            Inventory Impact {['fulfillment','shipment','complete','fulfilled'].includes(po.status) ? '(Applied)' : '(On Fulfillment)'}
          </div>
          {Object.entries(warehouseImpact).map(([wName, impact]) => (
            <div key={wName} className="so-detail__inventory-item">
              <div className="so-detail__inventory-warehouse">
                <Buildings size="0.875rem" style={{ color: 'var(--text-primary)' }} />
                {wName}
              </div>
              <span className="so-detail__inventory-badge">
                -{impact.qty} units ({impact.parts} SKUs)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Line items — materials by section */}
      {sections.length > 0 && (
        <div className="so-detail__materials-section">
          <div className="line-item__table-header">
            {['Item / Description', 'Quantity', 'Unit', 'Amount'].map(h => (
              <div key={h} className="line-item__table-cell" style={{ textAlign: h !== 'Item / Description' ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {sections.map(sec => (
            <SectionGroup
              key={sec}
              label={sec}
              items={materialLines.filter(l => (l.section_label || 'General') === sec)}
            />
          ))}
          <div className="so-detail__subtotal">
            <span>Materials Subtotal</span>
            <span>
              ${materialsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Labor lines */}
      {laborLines.length > 0 && (
        <div className="so-detail__labor-section">
          <div className="so-detail__labor-header">
            <span>Installation / Labor</span>
          </div>
          {laborLines.map((line, idx) => (
            <div key={line.id} className="so-detail__labor-row" style={{ borderBottom: idx < laborLines.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div>
                <div className="so-detail__labor-description">{line.description}</div>
              </div>
              <div className="so-detail__labor-cell">{line.quantity}</div>
              <div className="so-detail__labor-cell">${line.unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="so-detail__labor-cell">${(line.quantity * line.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
          <div className="so-detail__subtotal">
            <span>Labor Subtotal</span>
            <span>${laborTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Grand total */}
      {grandTotal > 0 && (
        <div className="so-detail__grand-total">
          <span>Total</span>
          <span>
            ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Notes */}
      {po.notes && (
        <div className="so-detail__notes">
          <div className="so-detail__notes-title">Notes</div>
          <div className="so-detail__notes-content">{po.notes}</div>
        </div>
      )}

      {/* ── CANCELLED BANNER ──────────────────────────────────────────────── */}
      {po.status === 'cancelled' && (po.cancelled_at || po.cancel_reason) && (
        <div className="so-detail__cancelled-banner">
          <div className="so-detail__cancelled-header">
            <Prohibit size="1rem" style={{ color: 'var(--state-error-text)' }} />
            <span>Order Cancelled</span>
          </div>
          {po.cancel_reason && (
            <div className="so-detail__cancelled-reason">
              <strong>Reason:</strong> {po.cancel_reason}
            </div>
          )}
          <div className="so-detail__cancelled-footer">
            {po.cancelled_by && <span>Cancelled by {po.cancelled_by}</span>}
            {po.cancelled_at && <span> · {new Date(po.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ──────────────────────────────────────────────────── */}
      {cancelModal && (
        <div className="so-detail__modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !cancelling) setCancelModal(false) }}>
          <div className="so-detail__modal">

            {/* Modal header */}
            <div className="so-detail__modal-header">
              <Prohibit size="1.25rem" style={{ color: '#fff' }} />
              <div>
                <div className="so-detail__modal-title">Cancel Sales Order</div>
                <div className="so-detail__modal-subtitle">{po.so_number} · {po.customer_name}</div>
              </div>
            </div>

            {/* Modal body */}
            <div className="so-detail__modal-body">
              {!cancelResult ? (
                <>
                  <div className="so-detail__modal-description">
                    This will cancel the order and return all allocated inventory to stock. This action cannot be undone.
                  </div>

                  {/* What will happen summary */}
                  <div className="so-detail__modal-summary">
                    <div className="s-o-detail-224f">This will:</div>
                    <div><ArrowCounterClockwise size="0.75rem" style={{ marginRight: 4 }} /> Return all allocated inventory to stock</div>
                    <div><X size="0.75rem" style={{ marginRight: 4 }} /> Remove fulfillment sheets and pending shipments</div>
                    <div><Prohibit size="0.75rem" style={{ marginRight: 4 }} /> Mark this SO as cancelled (preserved for audit)</div>
                  </div>

                  <label className="so-detail__modal-label">Reason for cancellation *</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="e.g., Customer requested change — will re-create with updated quantities"
                    rows={3}
                    className="so-detail__modal-textarea"
                  />

                  <div className="so-detail__modal-actions">
                    <button
                      onClick={() => { setCancelModal(false); setCancelReason(''); setCancelResult(null) }}
                      disabled={cancelling}
                      className="so-detail__modal-btn-secondary">
                      Go Back
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={!cancelReason.trim() || cancelling}
                      className="so-detail__modal-btn-primary" style={{ background: !cancelReason.trim() ? 'var(--text-muted)' : 'var(--state-error)' }}>
                      {cancelling ? <><div className="spinner s-o-detail-6199" /> Cancelling…</> : <><Prohibit size="0.875rem" /> Cancel Order</>}
                    </button>
                  </div>
                </>
              ) : cancelResult.success ? (
                <div className="so-detail__modal-result-success">
                  <CheckCircle size="2.75rem" weight="fill" style={{ color: 'var(--state-success)' }} />
                  <div className="so-detail__modal-result-title">Order Cancelled</div>
                  <div className="so-detail__modal-result-details">
                    {cancelResult.inventory_reversed > 0 && <div>{cancelResult.inventory_reversed} inventory allocation(s) returned to stock</div>}
                    {cancelResult.fulfillment_lines_deleted > 0 && <div>{cancelResult.fulfillment_lines_deleted} fulfillment line(s) removed</div>}
                    {cancelResult.shipments_deleted > 0 && <div>{cancelResult.shipments_deleted} pending shipment(s) removed</div>}
                    {cancelResult.inventory_reversed === 0 && cancelResult.fulfillment_lines_deleted === 0 && <div>No downstream data to reverse — order was cancelled cleanly.</div>}
                  </div>
                  <div className="so-detail__modal-result-footer">Redirecting to Sales Orders…</div>
                </div>
              ) : (
                <div className="so-detail__modal-result-error">
                  <Warning size="2.75rem" weight="fill" style={{ color: 'var(--state-error)' }} />
                  <div className="so-detail__modal-result-title-error">Cancel Failed</div>
                  <div className="so-detail__modal-result-error-msg">{cancelResult.error}</div>
                  <button
                    onClick={() => setCancelResult(null)}
                    className="so-detail__modal-result-retry-btn">
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
