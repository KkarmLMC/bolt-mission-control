import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightning, Hammer, Radio, CaretRight, ClipboardText, ArrowRight, DownloadSimple, ChartBar, Target, TrendUp } from '@phosphor-icons/react'
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
    { key: 'MEETING SET',   label: 'Meeting',  color: 'var(--warning)'  },
    { key: 'PROPOSAL SENT', label: 'Proposal', color: 'var(--purple)' },
    { key: 'ON BID LIST',   label: 'Bid List', color: 'var(--teal)'   },
    { key: 'BID SUBMITTED', label: 'Bid Out',  color: 'var(--blue-shade-20)'       },
    { key: 'WON ✓',         label: 'Won',      color: 'var(--success)'  },
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
    <div className="page-content fade-in">

      {/* Change Orders alert */}
      {pendingCOs.length > 0 && (
        <div onClick={() => navigate('/change-orders')} className="opportunities-1081">
          <ClipboardText size="1.25rem" className="opportunities-c612" />
          <div className="content-body">
            <div className="text-sm-bold">
              {pendingCOs.length} Part Request{pendingCOs.length !== 1 ? 's' : ''} Pending Review
            </div>
            <div className="opportunities-344d">
              {pendingCOs[0]?.job_reference}{pendingCOs.length > 1 ? ` + ${pendingCOs.length - 1} more` : ''}
            </div>
          </div>
          <ArrowRight size="1rem" className="opportunities-c612" />
        </div>
      )}

      {/* QB Import shortcut */}
      <div onClick={() => navigate('/qb-import')}
        className="opportunities-1aaf">
        <DownloadSimple size="1.125rem" className="opportunities-8597" />
        <div className="content-body">
          <div className="text-sm-bold">Import from QuickBooks</div>
          <div className="opportunities-941d">Upload a QB Desktop CSV to create Sales Orders</div>
        </div>
        <ArrowRight size="0.875rem" className="opportunities-ab83" />
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
        <div className="list-card__header">
          <span className="list-card__title"><ChartBar size="0.875rem" /> Stage Breakdown</span>
        </div>
        <div className="stage-breakdown-scroll">
          {stages.map(s => {
            const count = leads.filter(l => l.status === s.key).length
            const val   = leads.filter(l => l.status === s.key).reduce((acc, l) => acc + (l.value_int || 0), 0)
            return (
              <div key={s.key} className="stage-breakdown-card" style={{
                background: 'var(--white)',
                borderTop: `3px solid ${s.color}`, borderRadius: 'var(--r-m)', padding: '12px 14px' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: s.color, marginBottom: 4 }}>{s.label}</div>
                <div className="opportunities-7380">{count}</div>
                <div className="opportunities-7efa">{val > 0 ? fmt$(val) : '—'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Opportunity sources */}
      <div className="card">
        <div className="list-card__header">
          <span className="list-card__title"><Target size="0.875rem" /> Opportunity Sources</span>
        </div>
        <div className="opportunities-f5ad">
          {children.map(c => (
            <div key={c.label} onClick={() => c.path && navigate(c.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-l)', padding: 'var(--pad-m) var(--pad-l)', borderRadius: 'var(--r-l)', background: 'var(--white)', cursor: c.path ? 'pointer' : 'default', opacity: c.soon ? 0.5 : 1 }}>
              <c.Icon size="1.125rem" className="opportunities-ab83" />
              <div className="content-body">
                <div className="text-sm-semi">{c.label}</div>
                <div className="opportunities-12dd">{c.description}</div>
              </div>
              {c.count !== null && c.count !== undefined ? (
                <span className="opportunities-0cff">{c.count} new</span>
              ) : c.soon ? (
                <span className="opportunities-2557">Soon</span>
              ) : null}
              {c.path && <CaretRight size="1rem" className="opportunities-ab83" />}
            </div>
          ))}
        </div>
      </div>

      {/* Top leads */}
      <div className="card">
        <div className="list-card__header">
          <span className="list-card__title"><TrendUp size="0.875rem" /> Top Active Leads</span>
          <button className="list-card__action" onClick={() => navigate('/opportunities/permits')}>View all →</button>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : topLeads.length === 0 ? (
          <div className="empty">
            <Lightning size="2.25rem" className="empty-icon" />
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
                    <td><span className="cell-mono opportunities-440f">{fmt$(l.value_int)}</span></td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td><span className={`badge ${prioBadge(l.priority)}`}>{l.priority?.replace(/[🔴🟠🟡🟢]/, '').trim()}</span></td>
                    <td><span className="text-sm">{l.county}</span></td>
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
