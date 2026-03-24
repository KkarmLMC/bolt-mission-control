import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const OPPS_CHILDREN = [
  {
    path: '/opportunities',
    icon: '📊',
    label: 'Opportunities',
    sub: 'Aggregated overview',
    bg: 'var(--blue-soft)',
  },
  {
    path: '/opportunities/permits',
    icon: '⚡',
    label: 'Permit Feed',
    sub: 'Live permit leads',
    bg: 'var(--red-soft)',
  },
]

export default function MobileTabBar({ leads, tasks }) {
  const location  = useNavigate ? useLocation() : { pathname: '/' }
  const navigate  = useNavigate()
  const [oppsOpen, setOppsOpen] = useState(false)

  const isOpps    = location.pathname.startsWith('/opportunities')
  const newLeads  = leads.filter(l => l.status === 'NEW LEAD').length
  const openTasks = tasks.filter(t => !t.done).length

  const tabs = [
    { key: 'opportunities', icon: '📊', label: 'Opps',    badge: leads.filter(l => !['WON ✓','LOST ✗'].includes(l.status)).length },
    { key: 'relationships', icon: '🤝', label: 'Contacts', badge: 0 },
    { key: 'tasks',         icon: '✅', label: 'Tasks',    badge: openTasks },
  ]

  const handleTabPress = (key) => {
    if (key === 'opportunities') {
      setOppsOpen(o => !o)
    } else {
      setOppsOpen(false)
      navigate(`/${key}`)
    }
  }

  const handleOppsChild = (path) => {
    setOppsOpen(false)
    navigate(path)
  }

  return (
    <>
      {/* Overlay to close the sheet */}
      {oppsOpen && (
        <div
          onClick={() => setOppsOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 98,
            background: 'rgba(0,0,0,0.2)',
          }}
        />
      )}

      {/* Opportunities sub-menu sheet */}
      {oppsOpen && (
        <div className="mobile-opps-sheet">
          <div className="mobile-opps-handle" />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
            Opportunities
          </div>
          {OPPS_CHILDREN.map(c => (
            <button
              key={c.path}
              className={`mobile-opps-item ${location.pathname === c.path ? 'active' : ''}`}
              onClick={() => handleOppsChild(c.path)}
            >
              <div className="mobile-opps-icon" style={{ background: c.bg }}>{c.icon}</div>
              <div>
                <div className="mobile-opps-label">{c.label}</div>
                <div className="mobile-opps-sub">{c.sub}</div>
              </div>
              {c.path === '/opportunities/permits' && newLeads > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'var(--red-soft)', padding: '2px 8px', borderRadius: 10 }}>
                  {newLeads} new
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="mobile-tabbar">
        {tabs.map(tab => {
          const active =
            (tab.key === 'opportunities' && isOpps) ||
            (tab.key !== 'opportunities' && location.pathname === `/${tab.key}`)
          return (
            <button
              key={tab.key}
              className={`tab-item ${active ? 'active' : ''}`}
              onClick={() => handleTabPress(tab.key)}
            >
              {tab.badge > 0 && (
                <span className="tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>
              )}
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
