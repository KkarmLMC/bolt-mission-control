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

      <div className="um-invite-header">
        <button onClick={() => navigate('/sales-orders/new')}
          className="btn btn-navy"
          className="flex-gap-s">
          <Plus size="0.9375rem" weight="bold" /> New SO
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid sales-orders-63ba">
        <div className="stat-card">
          <div className="stat-card__label">Total Orders</div>
          <div className="stat-card__value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Active</div>
          <div className="stat-card__value" style={{ color: 'var(--brand-primary)' }}>
            {orders.filter(o => !['complete','cancelled'].includes(o.status)).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Value</div>
          <div className="stat-card__value sales-orders-4eb6">{fmt(totalValue)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="queue-search">
        <MagnifyingGlass size="0.9375rem" className="search-overlay-icon" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by SO#, customer, or project…"
          style={{ paddingLeft: 36 }} />
      </div>

      {/* Status filters */}
      <div className="filter-pills mb-l">
        {STATUS_LABELS.map(s => {
          const active = filter === s
          const count  = s === 'All' ? orders.length : counts[s]
          const sc     = s === 'All' ? { color: 'var(--text-primary)', bg: 'var(--surface-hover)' } : soStatus(s)
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`filter-pills__item${active ? ' filter-pills__item--active' : ''}`}
              style={active ? { background: s === 'All' ? 'var(--brand-primary)' : sc.bg, color: s === 'All' ? '#fff' : sc.color } : undefined}>
              {s === 'All' ? 'All' : sc.label} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="spinner-pad"><div className="spinner spinner-center" /></div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <Receipt size="2.25rem" className="empty-icon" />
          <div className="empty-title">No sales orders found</div>
          <div className="empty-desc">Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div className="card">
          {visible.map((o, idx) => {
            const sc = soStatus(o.status)
            return (
              <div key={o.id} onClick={() => navigate(`/sales-orders/${o.id}`)}
                className="queue-row" style={{ borderBottom: idx < visible.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <Receipt size="1rem" style={{ color: 'var(--brand-primary)' }} />
                <div className="queue-row__body">
                  <div className="sales-orders-faf9">
                    <span className="so-number">{o.so_number}</span>
                    <span className="badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <div className="queue-row__title">
                    {o.customer_name}{o.project_name ? ` — ${o.project_name}` : ''}
                  </div>
                  <div className="queue-row__meta">{fmtDate(o.created_at)}</div>
                </div>
                <div className="amount-mono">{fmt(o.grand_total)}</div>
                <CaretRight size="0.875rem" className="row-item__caret" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
