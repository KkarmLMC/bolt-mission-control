import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightning, Hammer, Radio, CaretRight, ClipboardText, ArrowRight, DownloadSimple } from '@phosphor-icons/react'
import { fmt$, statusBadge, prioBadge } from '../lib/utils'
import { db } from '../lib/supabase.js'

export default function Opportunities({ leads, loading }) {
  const navigate = useNavigate()
  const [pendingCOs, setPendingCOs] = useState([])

  useEffect(() => {
    db.from('change_orders').select('id, co_number, job_reference, submitted_by, created_at, change_order_items(id)')
      .eq('status', 'pending').order('created_at', { ascending: false })
      .then(({ data }) => setPendingCOs(data || []))
  }, [])

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
    { path: '/opportunities/permits', Icon: Lightning, label: 'Permit Feed',    description: 'Live commercial permit leads from Tampa Bay counties', count: newLeads, color: 'var(--red)'    },
    { path: null, Icon: Hammer,    label: 'Bid Board',      description: 'Active bids, RFPs, and quote requests',               color: 'var(--blue)',  soon: true },
    { path: null, Icon: Radio,     label: 'Scraped Sources', description: 'Aggregated leads from county portals and scraper pipelines', color: 'var(--purple)', soon: true },
  ]

  return (
    <div className="page fade-in">

      {/* Change Orders alert */}
      {pendingCOs.length > 0 && (
        <div onClick={() => navigate('/change-orders')} style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 'var(--r-xl)', padding: 'var(--sp-3) var(--sp-4)', marginBottom: 'var(--sp-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <ClipboardText size={20} style={{ color: '#C2410C', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#C2410C' }}>
              {pendingCOs.length} Part Request{pendingCOs.length !== 1 ? 's' : ''} Pending Review
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: '#9A3412', marginTop: 2 }}>
              {pendingCOs[0]?.job_reference}{pendingCOs.length > 1 ? ` + ${pendingCOs.length - 1} more` : ''}
            </div>
          </div>
          <ArrowRight size={16} style={{ color: '#C2410C', flexShrink: 0 }} />
        </div>
      )}

      {/* QB Import shortcut */}
      <div onClick={() => navigate('/qb-import')}
        style={{ background: 'var(--surface-raised)', borderRadius: 'var(--r-xl)', padding: 'var(--sp-3) var(--sp-4)', marginBottom: 'var(--sp-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', border: '1px solid var(--border-l)' }}>
        <DownloadSimple size={18} style={{ color: 'var(--navy)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Import from QuickBooks</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Upload a QB Desktop CSV to create Sales Orders</div>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
      </div>

      {/* Stat cards — flat, no icons, Field Ops style */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Pipeline Value</div>
          <div className="stat-value amber">{fmt$(pipelineVal)}</div>
          <div className="stat-delta">{activeLeads.length} active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Won Value</div>
          <div className="stat-value green">{fmt$(wonVal)}</div>
          <div className="stat-delta">Closed contracts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value blue">{winRate}%</div>
          <div className="stat-delta">Across {leads.length} leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical</div>
          <div className="stat-value red">{criticalCount}</div>
          <div className="stat-delta">Need action</div>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Stage Breakdown</span>
        </div>
        <div className="stage-breakdown-scroll">
          {stages.map(s => {
            const count = leads.filter(l => l.status === s.key).length
            const val   = leads.filter(l => l.status === s.key).reduce((acc, l) => acc + (l.value_int || 0), 0)
            return (
              <div key={s.key} className="stage-breakdown-card" style={{
                background: 'var(--surface-raised)', border: '1px solid var(--border-l)',
                borderTop: `3px solid ${s.color}`, borderRadius: 'var(--r-md)', padding: '12px 14px',
              }}>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: s.color, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 'var(--fs-stat)', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>{val > 0 ? fmt$(val) : '—'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Opportunity sources */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Opportunity Sources</span>
        </div>
        <div style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {children.map(c => (
            <div key={c.label} onClick={() => c.path && navigate(c.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-lg)', background: 'var(--surface-raised)', cursor: c.path ? 'pointer' : 'default', opacity: c.soon ? 0.5 : 1 }}>
              <c.Icon size={18} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-1)' }}>{c.label}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{c.description}</div>
              </div>
              {c.count !== null && c.count !== undefined ? (
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--red-soft)', color: 'var(--red)', flexShrink: 0 }}>{c.count} new</span>
              ) : c.soon ? (
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>Soon</span>
              ) : null}
              {c.path && <CaretRight size={14} style={{ color: 'var(--text-2)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Top leads */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Active Leads</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/opportunities/permits')}>View all →</button>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : topLeads.length === 0 ? (
          <div className="empty">
            <Lightning size={36} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
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
                    <td><span style={{ fontSize: 'var(--fs-sm)' }}>{l.county}</span></td>
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
