import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, MagnifyingGlass, CaretRight } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'

const STATUS_COLOR = {
  queued:       { bg: 'var(--purple-soft)', color: 'var(--purple-tint-20)' },
  running:      { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  fulfillment:  { bg: 'var(--blue-soft)', color: 'var(--blue-shade-40)' },
  shipment:     { bg: 'var(--blue-tint-80)', color: 'var(--blue-shade-20)' },
  back_ordered: { bg: 'var(--blue-tint-80)', color: 'var(--blue-shade-20)' },
  complete:     { bg: 'var(--success-soft)', color: 'var(--success-text)' },
  cancelled:    { bg: 'var(--grey-tint-80)', color: 'var(--grey-base)' } }

const STATUS_LABELS = ['All', 'queued', 'running', 'fulfillment', 'shipment', 'back_ordered', 'complete', 'cancelled']

const fmt = n => n ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function SalesOrders() {
  const navigate = useNavigate()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [filter, setFilter]   = useState('All')

  useEffect(() => {
    db.from('sales_orders')
      .select('id, so_number, customer_name, project_name, status, grand_total, created_at, division')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [])

  const q = query.toLowerCase()
  const visible = orders.filter(o => {
    const matchFilter = filter === 'All' || o.status === filter
    const matchQuery  = !q ||
      (o.so_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.project_name || '').toLowerCase().includes(q)
    return matchFilter && matchQuery
  })

  // Summary counts
  const counts = {}
  STATUS_LABELS.slice(1).forEach(s => { counts[s] = orders.filter(o => o.status === s).length })
  const totalValue = orders.filter(o => !['cancelled'].includes(o.status))
    .reduce((s, o) => s + Number(o.grand_total || 0), 0)

  return (
    <div className="page-content fade-in">

      {/* Header */}
      <div style={{ marginBottom: 'var(--mar-l)' }}>
        <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>MISSION CONTROL</div>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Sales Orders</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: 2 }}>All orders across Bolt LP and Lightning Master</div>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--mar-l)' }}>
        <div className="stat-card">
          <div className="stat-card__label">Total Orders</div>
          <div className="stat-card__value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Active</div>
          <div className="stat-card__value" style={{ color: 'var(--navy)' }}>
            {orders.filter(o => !['complete','cancelled'].includes(o.status)).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Value</div>
          <div className="stat-card__value" style={{ color: 'var(--navy)', fontSize: 'var(--text-lg)' }}>{fmt(totalValue)}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--mar-m)' }}>
        <MagnifyingGlass size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by SO#, customer, or project…"
          className="search-input"
          style={{ paddingLeft: 36, background: 'var(--white)' }}
        />
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 'var(--gap-s)', flexWrap: 'wrap', marginBottom: 'var(--mar-l)', overflowX: 'auto' }}>
        {STATUS_LABELS.map(s => {
          const active = filter === s
          const count  = s === 'All' ? orders.length : counts[s]
          const sc     = STATUS_COLOR[s] || {}
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '4px 12px', borderRadius: 'var(--r-xxl)',
              background: active ? (sc.bg || 'var(--navy)') : 'var(--white)',
              color: active ? (sc.color || '#fff') : 'var(--black)',
              fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all var(--ease-fast)' }}>
              {s === 'All' ? 'All' : s.replace('_', ' ')} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--pad-xxl)' }}><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <Receipt size={36} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
          <div className="empty-title">No sales orders found</div>
          <div className="empty-desc">Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div className="card">
          {visible.map((o, idx) => {
            const sc = STATUS_COLOR[o.status] || { bg: 'var(--grey-tint-80)', color: 'var(--grey-base)' }
            return (
              <div key={o.id}
                onClick={() => navigate(`/sales-orders/${o.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-m)', padding: 'var(--pad-m) var(--pad-l)', borderBottom: idx < visible.length - 1 ? '1px solid var(--border-l)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-l)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Receipt size={16} style={{ color: 'var(--navy)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy)' }}>{o.so_number}</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sc.bg, color: sc.color }}>{(o.status || '').replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.customer_name}{o.project_name ? ` — ${o.project_name}` : ''}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 1 }}>{fmtDate(o.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>{fmt(o.grand_total)}</div>
                </div>
                <CaretRight size={14} style={{ color: 'var(--black)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
