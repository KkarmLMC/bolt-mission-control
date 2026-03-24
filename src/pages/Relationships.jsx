import { useState } from 'react'

export default function Relationships({ rels, loading, onAdd, onEdit }) {
  const [typeF, setTypeF] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = rels.filter(r => {
    const mt = typeF === 'ALL' || r.type === typeF
    const ms = !search || [r.company_name, r.key_contact, r.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return mt && ms
  })

  const score = r => [r.linkedin_done, r.meeting_done, r.preq_submitted, r.on_bid_list, r.spec_sent].filter(Boolean).length

  return (
    <div className="page fade-in">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Total Companies</span><div className="stat-icon blue">🏢</div></div>
          <div className="stat-value blue">{rels.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">GC Relationships</span><div className="stat-icon blue">🏗️</div></div>
          <div className="stat-value">{rels.filter(r => r.type === 'GC').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">MEP Engineers</span><div className="stat-icon amber">⚡</div></div>
          <div className="stat-value amber">{rels.filter(r => r.type === 'MEP Engineer').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">On Bid Lists</span><div className="stat-icon green">✅</div></div>
          <div className="stat-value green">{rels.filter(r => r.on_bid_list).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <span className="card-title-dot" style={{ background: 'var(--amber)' }} />
            Companies & Relationships
          </span>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add Company</button>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <div className="filter-bar">
            {['ALL','GC','MEP Engineer','Owner/Developer'].map(t => (
              <button key={t} className={`filter-pill ${typeF === t ? 'active' : ''}`} onClick={() => setTypeF(t)}>{t}</button>
            ))}
            <div className="search-box">
              <span style={{ color: 'var(--text-3)' }}>🔍</span>
              <input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading"><div className="spinner" /><span>Loading...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🤝</div>
              <div className="empty-title">No companies yet</div>
              <div className="empty-desc">Add your GC and MEP engineer relationships to track outreach progress.</div>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onAdd}>+ Add First Company</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Company</th><th>Type</th><th>Tier</th><th>Contact</th><th>Phone</th><th>Progress</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => onEdit(r)}>
                      <td>
                        <div className="cell-primary">{r.company_name}</div>
                        <div className="cell-sub">{r.city}</div>
                      </td>
                      <td>
                        <span className={`badge ${r.type === 'GC' ? 'badge-gc' : r.type === 'MEP Engineer' ? 'badge-mep' : 'badge-dev'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td><span className={`badge badge-t${r.tier?.replace('T', '')}`}>{r.tier}</span></td>
                      <td>
                        <div style={{ fontSize: 13 }}>{r.key_contact || '—'}</div>
                        <div className="cell-sub">{r.contact_role || ''}</div>
                      </td>
                      <td><span className="cell-mono" style={{ fontSize: 12 }}>{r.phone || '—'}</span></td>
                      <td>
                        <div className="progress-pips">
                          {[r.linkedin_done, r.meeting_done, r.preq_submitted, r.on_bid_list, r.spec_sent].map((d, i) => (
                            <div key={i} className={`pip ${d ? 'done' : ''}`} />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{score(r)}/5 steps</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(r)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
