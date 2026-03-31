import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, MagnifyingGlass, CaretRight, Plus } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { soStatus } from '../lib/statusColors.js'

const STATUS_LABELS = ['All', 'queued', 'running', 'fulfillment', 'shipment', 'back_ordered', 'complete', 'cancelled']

const fmt     = n => n ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'
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

  const counts = {}
  STATUS_LABELS.slice(1).forEach(s => { counts[s] = orders.filter(o => o.status === s).length })
  const totalValue = orders
    .filter(o => !['cancelled'].includes(o.status))
    .reduce((s, o) => s + Number(o.grand_total || 0), 0)

  return (
    <div className="page-content fade-in">

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--mar-m)' }}>
        <button onClick={() => navigate('/sales-orders/new')}
          className="btn btn-navy"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-s)' }}>
          <Plus size="0.9375rem" weight="bold" /> New SO
        </button>
      </div>

      {/* Stats */}
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
        <MagnifyingGlass size="0.9375rem" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by SO#, customer, or project…"
          style={{ paddingLeft: 36, width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 'var(--gap-s)', flexWrap: 'wrap', marginBottom: 'var(--mar-l)' }}>
        {STATUS_LABELS.map(s => {
          const active = filter === s
          const count  = s === 'All' ? orders.length : counts[s]
          const sc     = s === 'All' ? { color: 'var(--black)', bg: 'var(--hover)' } : soStatus(s)
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '4px 12px', borderRadius: 'var(--r-s)',
              background: active ? (s === 'All' ? 'var(--navy)' : sc.bg) : 'var(--white)',
              color: active ? (s === 'All' ? '#fff' : sc.color) : 'var(--black)',
              fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all var(--ease-fast)' }}>
              {s === 'All' ? 'All' : sc.label} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--pad-xxl)' }}><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <Receipt size="2.25rem" style={{ color: 'var(--text-3)', marginBottom: 8 }} />
          <div className="empty-title">No sales orders found</div>
          <div className="empty-desc">Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div className="card">
          {visible.map((o, idx) => {
            const sc = soStatus(o.status)
            return (
              <div key={o.id}
                onClick={() => navigate(`/sales-orders/${o.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-m)', padding: 'var(--pad-m) var(--pad-l)', borderBottom: idx < visible.length - 1 ? '1px solid var(--border-l)' : 'none', cursor: 'pointer' }}>
                <Receipt size="1rem" style={{ color: 'var(--navy)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy)' }}>{o.so_number}</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.customer_name}{o.project_name ? ` — ${o.project_name}` : ''}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 1 }}>{fmtDate(o.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>{fmt(o.grand_total)}</div>
                </div>
                <CaretRight size="0.875rem" style={{ color: 'var(--black)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
