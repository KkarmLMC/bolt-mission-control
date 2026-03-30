import { useState } from 'react'
import { MagnifyingGlass, Lightning, X } from '@phosphor-icons/react'
import { fmt$, prioBadge, statusBadge } from '../lib/utils'
import FAB from '../components/FAB'

export default function PermitFeed({ leads, loading, onAdd, onEdit }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = leads.filter(l => {
    const mf = filter === 'ALL' || l.priority?.includes(filter) || l.status === filter
    const ms = !search || [l.project_name, l.address, l.county, l.contractor, l.permit_number]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return mf && ms
  })

  const counts = {
    total:       leads.length,
    critical:    leads.filter(l => l.priority?.includes('CRITICAL')).length,
    high:        leads.filter(l => l.priority?.includes('HIGH')).length,
    uncontacted: leads.filter(l => l.status === 'NEW LEAD').length,
  }

  return (
    <div className="page fade-in">

      {/* Flat stat cards — no icons */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Leads</div>
          <div className="stat-value blue">{counts.total}</div>
          <div className="stat-delta">All active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical</div>
          <div className="stat-value red">{counts.critical}</div>
          <div className="stat-delta">Call this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Priority</div>
          <div className="stat-value amber">{counts.high}</div>
          <div className="stat-delta">Over $1M</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New</div>
          <div className="stat-value green">{counts.uncontacted}</div>
          <div className="stat-delta">Uncontacted</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Permit Leads</span>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add Lead</button>
        </div>

        <div style={{ padding: 'var(--sp-3) var(--sp-4) 0' }}>
          <div className="filter-bar">
            {['ALL','CRITICAL','HIGH','MEDIUM','NEW LEAD','CONTACTED','WON ✓'].map(f => (
              <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="search-box" style={{ marginBottom: 8 }}>
            <MagnifyingGlass size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex' }}><X size={13} /></button>}
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading"><div className="spinner" /><span>Loading leads...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <Lightning size={36} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
              <div className="empty-title">No leads yet</div>
              <div className="empty-desc">Add leads manually or run the permit scraper.</div>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onAdd}>+ Add First Lead</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Priority</th><th>Project</th><th>Value</th><th>County</th><th>Status</th><th>Contractor</th><th>Next Action</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} onClick={() => onEdit(l)}>
                      <td><span className={`badge ${prioBadge(l.priority)}`}>{l.priority?.replace(/[🔴🟠🟡🟢]/, '').trim()}</span></td>
                      <td>
                        <div className="cell-primary">{l.project_name}</div>
                        <div className="cell-sub">{l.address || l.permit_number || '—'}</div>
                      </td>
                      <td><span className="cell-mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>{fmt$(l.value_int)}</span></td>
                      <td><span className="badge" style={{ background: 'var(--surface-raised)', color: 'var(--black)' }}>{l.county}</span></td>
                      <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                      <td><span style={{ fontSize: 'var(--text-sm)' }}>{l.contractor || '—'}</span></td>
                      <td><span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.next_action || '—'}</span></td>
                      <td onClick={e => e.stopPropagation()}><button className="btn btn-ghost btn-sm" onClick={() => onEdit(l)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FAB onClick={onAdd} />
    </div>
  )
}
