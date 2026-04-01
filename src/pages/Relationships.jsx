import { useState } from 'react'
import { MagnifyingGlass, Handshake, X } from '@phosphor-icons/react'
import FAB from '../components/FAB'

export default function Relationships({ rels, loading, onAdd, onEdit }) {
  const [typeF, setTypeF]   = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = rels.filter(r => {
    const mt = typeF === 'ALL' || r.type === typeF
    const ms = !search || [r.company_name, r.key_contact, r.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return mt && ms
  })

  const score = r => [r.linkedin_done, r.meeting_done, r.preq_submitted, r.on_bid_list, r.spec_sent].filter(Boolean).length

  return (
    <div className="page-content fade-in">

      {/* Flat stat cards — no icons */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value blue">{rels.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">GCs</div>
          <div className="stat-value">{rels.filter(r => r.type === 'GC').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MEP Eng.</div>
          <div className="stat-value amber">{rels.filter(r => r.type === 'MEP Engineer').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bid Lists</div>
          <div className="stat-value green">{rels.filter(r => r.on_bid_list).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="list-card__header">
          <span className="list-card__title"><Handshake size="0.875rem" /> Companies & Relationships</span>
          <button className="list-card__action" onClick={onAdd}>+ Add Company</button>
        </div>

        <div style={{ padding: 'var(--pad-s) var(--pad-l) 0' }}>
          <div className="filter-bar">
            {['ALL','GC','MEP Engineer','Owner/Developer'].map(t => (
              <button key={t} className={`filter-pill ${typeF === t ? 'active' : ''}`} onClick={() => setTypeF(t)}>{t}</button>
            ))}
          </div>
          <div className="search-box" style={{ marginBottom: 'var(--space-s)' }}>
            <MagnifyingGlass size="1rem" className="relationships-0d77" />
            <input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="relationships-52f0"><X size="0.8125rem" /></button>}
          </div>
        </div>

        <div className="list-card__body">
          {loading ? (
            <div className="loading"><div className="spinner" /><span>Loading...</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <Handshake size="2.25rem" className="empty-icon" />
              <div className="empty-title">No companies yet</div>
              <div className="empty-desc">Add your GC and MEP engineer relationships.</div>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-s)' }} onClick={onAdd}>+ Add First Company</button>
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
                      <td><span className={`badge ${r.type === 'GC' ? 'badge-gc' : r.type === 'MEP Engineer' ? 'badge-mep' : 'badge-dev'}`}>{r.type}</span></td>
                      <td><span className={`badge badge-t${r.tier?.replace('T', '')}`}>{r.tier}</span></td>
                      <td>
                        <div className="text-sm">{r.key_contact || '—'}</div>
                        <div className="cell-sub">{r.contact_role || ''}</div>
                      </td>
                      <td><span className="cell-mono text-sm">{r.phone || '—'}</span></td>
                      <td>
                        <div className="progress-pips">
                          {[r.linkedin_done, r.meeting_done, r.preq_submitted, r.on_bid_list, r.spec_sent].map((d, i) => (
                            <div key={i} className={`pip ${d ? 'done' : ''}`} />
                          ))}
                        </div>
                        <span className="relationships-941d">{score(r)}/5</span>
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

      <FAB onClick={onAdd} />
    </div>
  )
}
