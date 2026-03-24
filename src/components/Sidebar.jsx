import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
      {t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      {' · '}
      {t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    </span>
  )
}

const NAV_ITEMS = [
  { path: '/',             icon: '⚡', label: 'Permit Feed'   },
  { path: '/pipeline',     icon: '📊', label: 'Pipeline'      },
  { path: '/relationships',icon: '🤝', label: 'Relationships' },
  { path: '/tasks',        icon: '✅', label: 'Task Board'    },
]

export default function Sidebar({ leads, rels, tasks }) {
  const location = useLocation()
  const navigate = useNavigate()

  const newLeads     = leads.filter(l => l.status === 'NEW LEAD').length
  const activeLeads  = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status)).length
  const openTasks    = tasks.filter(t => !t.done).length
  const overdueTasks = tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
  const criticalLeads= leads.filter(l => l.priority?.includes('CRITICAL')).length

  const counts = {
    '/':              newLeads,
    '/pipeline':      activeLeads,
    '/relationships': rels.length,
    '/tasks':         openTasks,
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
        </div>
        <div>
          <div className="logo-name">Bolt LP</div>
          <div className="logo-sub">Mission Control</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path
          const count  = counts[item.path] || 0
          return (
            <button
              key={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {count > 0 && (
                <span className={`nav-badge ${active ? 'active-badge' : 'gray'}`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {(criticalLeads > 0 || overdueTasks > 0) && (
        <div className="sidebar-section">
          <div className="divider" style={{ marginBottom: 8 }} />
          <div className="sidebar-section-label">Alerts</div>
          {criticalLeads > 0 && (
            <div className="alert-item alert-red">
              <span style={{ fontSize: 13 }}>🔴</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>
                {criticalLeads} critical lead{criticalLeads > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {overdueTasks > 0 && (
            <div className="alert-item alert-amber">
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#B45309' }}>
                {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="status-live" style={{ marginBottom: 10, paddingLeft: 10 }}>
          <div className="dot-live" />LIVE
        </div>
        <div style={{ paddingLeft: 10, marginBottom: 8 }}>
          <Clock />
        </div>
        <div className="user-card">
          <div className="avatar">KK</div>
          <div>
            <div className="user-name">Kodylee Karm</div>
            <div className="user-role">Bolt LP · Clearwater</div>
          </div>
        </div>
      </div>
    </div>
  )
}
