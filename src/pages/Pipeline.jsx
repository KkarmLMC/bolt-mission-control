import { fmt$, prioClass } from '../lib/utils'

const STAGES = [
  { key: 'NEW LEAD',       label: 'New Leads',    color: 'var(--red)'    },
  { key: 'CONTACTED',      label: 'Contacted',    color: 'var(--blue)'   },
  { key: 'MEETING SET',    label: 'Meeting Set',  color: 'var(--warning)'  },
  { key: 'PROPOSAL SENT',  label: 'Proposal Out', color: 'var(--purple)' },
  { key: 'ON BID LIST',    label: 'On Bid List',  color: 'var(--teal)'   },
  { key: 'BID SUBMITTED',  label: 'Bid Submitted',color: 'var(--blue-shade-20)'       },
  { key: 'WON ✓',          label: 'Won',          color: 'var(--success)'  },
  { key: 'LOST ✗',         label: 'Lost',         color: 'var(--text-3)' },
]

export default function Pipeline({ leads, onEdit }) {
  const pipelineVal = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status)).reduce((s, l) => s + (l.value_int || 0), 0)
  const wonVal      = leads.filter(l => l.status === 'WON ✓').reduce((s, l) => s + (l.value_int || 0), 0)

  return (
    <div className="page fade-in">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Pipeline Value</span><div className="stat-icon amber">💰</div></div>
          <div className="stat-value amber">{fmt$(pipelineVal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Won Value</span><div className="stat-icon green">🏆</div></div>
          <div className="stat-value green">{fmt$(wonVal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Active Opps</span><div className="stat-icon blue">📊</div></div>
          <div className="stat-value blue">{leads.filter(l => l.status !== 'LOST ✗').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Win Rate</span><div className="stat-icon red">🎯</div></div>
          <div className="stat-value red">
            {leads.length ? Math.round(leads.filter(l => l.status === 'WON ✓').length / leads.length * 100) : 0}%
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <span className="card-title-dot" style={{ background: 'var(--blue)' }} />
            Pipeline Board
          </span>
        </div>
        <div style={{ padding: 16, overflowX: 'auto' }}>
          <div className="kanban">
            {STAGES.map(stage => {
              const cards = leads.filter(l => l.status === stage.key)
              const val   = cards.reduce((s, l) => s + (l.value_int || 0), 0)
              return (
                <div className="kanban-col" key={stage.key}>
                  <div className="kanban-header" style={{ borderTop: `3px solid ${stage.color}` }}>
                    <div className="kanban-title" style={{ color: stage.color }}>
                      {stage.label}
                      <span className="kanban-count">{cards.length}</span>
                    </div>
                    <div className="kanban-value">{val > 0 ? fmt$(val) : '—'}</div>
                  </div>
                  <div className="kanban-cards">
                    {cards.length === 0 ? (
                      <div style={{ color: 'var(--text-4)', fontSize: 'var(--text-xs)', textAlign: 'center', padding: '16px 8px' }}>Empty</div>
                    ) : cards.map(l => (
                      <div key={l.id} className={`k-card ${prioClass(l.priority)}`} onClick={() => onEdit(l)}>
                        <div className="k-title">{l.project_name}</div>
                        <div className="k-meta">{l.county} · {l.contractor || 'No GC'}</div>
                        <div className="k-value">{fmt$(l.value_int)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
