import { useState, useEffect } from 'react'
import {
  ClipboardText, Clock, CheckCircle, XCircle,
  ArrowRight, Package, Warning,
} from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.jsx'

const STATUS = {
  pending:  { label: 'Pending Review', bg: '#FFF7ED', color: '#C2410C' },
  approved: { label: 'Approved',       bg: '#F0FDF4', color: '#15803D' },
  rejected: { label: 'Rejected',       bg: '#FEF2F2', color: '#B91C1C' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

function COModal({ co, onClose, onAction }) {
  const { profile } = useAuth()
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleAction = async (action) => {
    setError('')
    setSaving(true)
    try {
      // Update CO status
      const update = {
        status:       action,
        reviewed_by:  profile?.full_name || profile?.email,
        reviewed_at:  new Date().toISOString(),
        review_notes: notes || null,
      }

      if (action === 'approved') {
        // Auto-create Draft Sales Order
        const soNumber = 'SO-' + Date.now().toString().slice(-6)
        const { data: so, error: soErr } = await db
          .from('purchase_orders')
          .insert({
            po_number:     soNumber,
            project_name:  co.job_reference,
            job_reference: co.job_reference,
            division:      co.division,
            status:        'draft',
            notes:         `Auto-created from Change Order ${co.co_number}. Justification: ${co.justification}`,
            created_by:    profile?.full_name || profile?.email,
            customer_name: co.submitted_by,
          })
          .select('id')
          .single()

        if (soErr) throw soErr

        // Create line items from CO items
        if (co.change_order_items?.length) {
          const lines = co.change_order_items.map((item, idx) => ({
            po_id:       so.id,
            line_type:   'material',
            part_id:     item.part_id,
            description: item.parts?.name || 'Unknown Part',
            sku:         item.parts?.sku || '',
            quantity:    item.quantity,
            unit_cost:   item.parts?.unit_cost || 0,
            warehouse_id: co.warehouse_id || null,
            sort_order:  idx,
          }))
          const { error: liErr } = await db.from('po_line_items').insert(lines)
          if (liErr) throw liErr
        }

        update.converted_po_id = so.id
      }

      const { error: coErr } = await db.from('change_orders').update(update).eq('id', co.id)
      if (coErr) throw coErr

      onAction(action, co.id, notes)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', padding: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 'var(--sp-6) var(--sp-5)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', fontFamily: 'var(--mono)', color: 'var(--text-3)', marginBottom: 4 }}>{co.co_number}</div>
            <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800 }}>{co.job_reference}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>
              Submitted by <strong>{co.submitted_by}</strong> · {new Date(co.created_at).toLocaleDateString()}
            </div>
          </div>
          <StatusBadge status={co.status} />
        </div>

        {/* Justification */}
        <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)' }}>Justification</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)', lineHeight: 1.6 }}>{co.justification || '—'}</div>
        </div>

        {/* Parts */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)' }}>Parts Requested</div>
          {co.change_order_items?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-3) 0', borderBottom: '1px solid var(--border-l)' }}>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{item.parts?.name || '—'}</div>
                {item.parts?.sku && <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{item.parts.sku}</div>}
                {item.notes && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{item.notes}</div>}
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, fontFamily: 'var(--mono)' }}>×{item.quantity}</div>
            </div>
          ))}
        </div>

        {/* Review notes + actions — only if pending */}
        {co.status === 'pending' && (
          <>
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                Review Notes <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add context for the field team or warehouse…" rows={2}
                style={{ width: '100%', padding: 'var(--sp-3)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-l)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font)', resize: 'vertical' }} />
            </div>

            {error && <div style={{ padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-lg)', background: 'var(--error-soft)', color: 'var(--error-alt)', fontSize: 'var(--fs-xs)', marginBottom: 'var(--sp-3)' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
              <button onClick={() => handleAction('rejected')} disabled={saving}
                style={{ padding: 'var(--sp-3)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border-l)', background: 'var(--surface-raised)', color: 'var(--error)', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <XCircle size={16} /> Reject
              </button>
              <button onClick={() => handleAction('approved')} disabled={saving}
                style={{ padding: 'var(--sp-3)', borderRadius: 'var(--r-xl)', border: 'none', background: 'var(--navy)', color: '#fff', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? <div className="spinner" style={{ borderTopColor: '#fff' }} /> : <><CheckCircle size={16} /> Approve → SO</>}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 'var(--sp-2)' }}>
              Approving creates a Draft Sales Order in Warehouse IQ automatically.
            </div>
          </>
        )}

        {/* Already reviewed */}
        {co.status !== 'pending' && co.review_notes && (
          <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>Review Notes</div>
            <div style={{ fontSize: 'var(--fs-sm)' }}>{co.review_notes}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>by {co.reviewed_by} · {new Date(co.reviewed_at).toLocaleDateString()}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChangeOrders() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pending')
  const [selected, setSelected] = useState(null)

  const load = () => {
    db.from('change_orders')
      .select(`*, change_order_items(*, parts(id, name, sku, unit_cost)), warehouses(name, city)`)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const filtered = orders.filter(o => filter === 'all' || o.status === filter)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const handleAction = (action, id) => {
    setSelected(null)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: action } : o))
  }

  return (
    <div className="page fade-in">
      {/* Flat stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className={`stat-value ${pendingCount > 0 ? 'amber' : ''}`}>{pendingCount}</div>
          <div className="stat-delta">Awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value green">{orders.filter(o => o.status === 'approved').length}</div>
          <div className="stat-delta">Converted to SO</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value red">{orders.filter(o => o.status === 'rejected').length}</div>
          <div className="stat-delta">This period</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-delta">All time</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Change Orders</span>
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#FFF7ED', color: '#C2410C' }}>
              {pendingCount} need review
            </span>
          )}
        </div>

        <div style={{ padding: 'var(--sp-3) var(--sp-4) 0' }}>
          <div className="filter-bar">
            {[['pending','Pending'], ['approved','Approved'], ['rejected','Rejected'], ['all','All']].map(([val, lbl]) => (
              <button key={val} className={`filter-pill ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>
                {lbl}{val === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <ClipboardText size={36} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
            <div className="empty-title">{filter === 'pending' ? 'No pending requests' : 'Nothing here'}</div>
            <div className="empty-desc">Field part requests will appear here for review.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>CO #</th><th>Job Reference</th><th>Parts</th><th>Submitted By</th><th>Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(co => (
                  <tr key={co.id} onClick={() => setSelected(co)}>
                    <td><span className="cell-mono">{co.co_number}</span></td>
                    <td>
                      <div className="cell-primary">{co.job_reference}</div>
                      {co.warehouses && <div className="cell-sub">{co.warehouses.name}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={13} style={{ color: 'var(--text-3)' }} />
                        <span style={{ fontSize: 12 }}>{co.change_order_items?.length || 0} part{co.change_order_items?.length !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 13 }}>{co.submitted_by}</span></td>
                    <td><span className="cell-mono" style={{ fontSize: 11 }}>{new Date(co.created_at).toLocaleDateString()}</span></td>
                    <td><StatusBadge status={co.status} /></td>
                    <td><ArrowRight size={14} style={{ color: 'var(--text-3)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <COModal co={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
    </div>
  )
}
