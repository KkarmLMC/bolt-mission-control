import { useNavigate } from 'react-router-dom'
import {
  CurrencyDollar, Trophy, Target, Warning,
  Lightning, Hammer, Radio, CaretRight,
} from '@phosphor-icons/react'
import { fmt$, statusBadge, prioBadge } from '../lib/utils'

export default function Opportunities({ leads, loading }) {
  const navigate = useNavigate()

  const activeLeads   = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status))
  const pipelineVal   = activeLeads.reduce((s, l) => s + (l.value_int || 0), 0)
  const wonVal        = leads.filter(l => l.status === 'WON ✓').reduce((s, l) => s + (l.value_int || 0), 0)
  const winRate       = leads.length ? Math.round(leads.filter(l => l.status === 'WON ✓').length / leads.length * 100) : 0
  const criticalCount = leads.filter(l => l.priority?.includes('CRITICAL')).length
  const newLeads      = leads.filter(l => l.status === 'NEW LEAD').length

  const stages = [
    { key: 'NEW LEAD',      label: 'New',      color: 'var(--red)'    },
    { key: 'CONTACTED',     label: 'Contacted',color: 'var(--blue)'   },
    { key: 'MEETING SET',   label: 'Meeting',  color: 'var(--amber)'  },
    { key: 'PROPOSAL SENT', label: 'Proposal', color: 'var(--purple)' },
    { key: 'ON BID LIST',   label: 'Bid List', color: 'var(--teal)'   },
    { key: 'BID SUBMITTED', label: 'Bid Out',  color: '#0891B2'       },
    { key: 'WON ✓',         label: 'Won',      color: 'var(--green)'  },
    { key: 'LOST ✗',        label: 'Lost',     color: 'var(--text-4)' },
  ]

  const topLeads = [...activeLeads]
    .sort((a, b) => (b.value_int || 0) - (a.value_int || 0))
    .slice(0, 5)

  const children = [
    { path: '/opportunities/permits', Icon: Lightning, label: 'Permit Feed',    description: 'Live commercial permit leads from Tampa Bay counties', count: newLeads, countLabel: 'new',        color: 'var(--red)'    },
    { path: null,                     Icon: Hammer,    label: 'Bid Board',      description: 'Active bids, RFPs, and quote requests',               count: null,     countLabel: 'coming soon', color: 'var(--blue)',  soon: true },
    { path: null,                     Icon: Radio,     label: 'Scraped Sources',description: 'Aggregated leads from county portals and scraper pipelines', count: null, countLabel: 'coming soon', color: 'var(--purple)', soon: true },
  ]

  return (
    <div className="page fade-in">
      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Pipeline Value</span><div className="stat-icon amber"><CurrencyDollar size={16} weight="bold" style={{ color: 'var(--amber)' }} /></div></div>
          <div className="stat-value amber">{fmt$(pipelineVal)}</div>
          <div className="stat-delta">{activeLeads.length} active opportunities</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Won Value</span><div className="stat-icon green"><Trophy size={16} weight="bold" style={{ color: 'var(--green)' }} /></div></div>
          <div className="stat-value green">{fmt$(wonVal)}</div>
          <div className="stat-delta">Closed contracts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Win Rate</span><div className="stat-icon blue"><Target size={16} weight="bold" style={{ color: 'var(--blue)' }} /></div></div>
          <div className="stat-value blue">{winRate}%</div>
          <div className="stat-delta">All-time across {leads.length} leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Critical</span><div className="stat-icon red"><Warning size={16} weight="fill" style={{ color: 'var(--red)' }} /></div></div>
          <div className="stat-value red">{criticalCount}</div>
          <div className="stat-delta">Require immediate action</div>
        </div>
      </div>

      {/* Stage funnel */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <span className="card-dot" style={{ background: 'var(--blue)', width: 8, height: 8, borderRadius: 2, display: 'inline-block' }} />
            Stage Breakdown
          </span>
        </div>
        <div className="stage-breakdown-scroll">
          {stages.map(s => {
            const count = leads.filter(l => l.status === s.key).length
            const val   = leads.filter(l => l.status === s.key).reduce((acc, l) => acc + (l.value_int || 0), 0)
            return (
              <div key={s.key} className="stage-breakdown-card" style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderTop: `3px solid ${s.color}`, borderRadius: 8, padding: '12px 14px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                  {val > 0 ? fmt$(val) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Opportunity sources */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">
            <span className="card-dot" style={{ background: 'var(--amber)', width: 8, height: 8, borderRadius: 2, display: 'inline-block' }} />
            Opportunity Sources
          </span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children.map(c => (
            <div key={c.label} onClick={() => c.path && navigate(c.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)', background: c.soon ? 'var(--bg)' : 'var(--surface)', cursor: c.path ? 'pointer' : 'default', opacity: c.soon ? 0.6 : 1, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (c.path) e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.Icon size={18} weight="bold" style={{ color: c.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{c.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{c.description}</div>
              </div>
              {c.count !== null ? (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: c.color + '18', color: c.color }}>{c.count} {c.countLabel}</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'var(--bg)', color: 'var(--text-3)', border: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soon</span>
              )}
              {c.path && <CaretRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Top leads */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <span className="card-dot" style={{ background: 'var(--green)', width: 8, height: 8, borderRadius: 2, display: 'inline-block' }} />
            Top Active Leads
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/opportunities/permits')}>View all →</button>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : topLeads.length === 0 ? (
          <div className="empty">
            <Lightning size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div className="empty-title">No active leads</div>
            <div className="empty-desc">Add leads via Permit Feed to see them here.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Project</th><th>Value</th><th>Stage</th><th>Priority</th><th>County</th></tr></thead>
              <tbody>
                {topLeads.map(l => (
                  <tr key={l.id} onClick={() => navigate('/opportunities/permits')}>
                    <td>
                      <div className="cell-primary">{l.project_name}</div>
                      <div className="cell-sub">{l.contractor || '—'}</div>
                    </td>
                    <td><span className="cell-mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>{fmt$(l.value_int)}</span></td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td><span className={`badge ${prioBadge(l.priority)}`}>{l.priority?.replace(/[🔴🟠🟡🟢]/, '').trim()}</span></td>
                    <td><span style={{ fontSize: 12 }}>{l.county}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
