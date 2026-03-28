import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChartBar, Handshake, CheckSquare, Lightning,
  Warning, SignOut, ArrowLineLeft, ArrowLineRight,
} from '@phosphor-icons/react'
import { useAuth } from '../lib/useAuth.jsx'

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mono)' }}>
      {t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      {' · '}
      {t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    </span>
  )
}

export default function Sidebar({ leads = [], rels = [], tasks = [] }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { profile, signOut } = useAuth()

  const newLeads      = leads.filter(l => l.status === 'NEW LEAD').length
  const activeLeads   = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status)).length
  const openTasks     = tasks.filter(t => !t.done).length
  const overdueTasks  = tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
  const criticalLeads = leads.filter(l => l.priority?.includes('CRITICAL')).length
  const isOppsActive  = location.pathname.startsWith('/opportunities')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const topNavItems = [
    { path: '/opportunities', Icon: ChartBar,   label: 'Opportunities', count: activeLeads },
    { path: '/relationships', Icon: Handshake,  label: 'Relationships',  count: rels.length },
    { path: '/tasks',         Icon: CheckSquare, label: 'Task Board',    count: openTasks   },
  ]

  const oppsChildren = [
    { path: '/opportunities/permits', Icon: Lightning, label: 'Permit Feed', count: newLeads },
  ]

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Lightning size={18} weight="fill" color="white" />
        </div>
        <div>
          <div className="logo-name">Mission Control</div>
          <div className="logo-sub">Bolt LP · LMC</div>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {topNavItems.map(item => {
          const active = location.pathname === item.path ||
            (item.path === '/opportunities' && isOppsActive)
          return (
            <div key={item.path}>
              <button
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-icon"><item.Icon size={16} weight={active ? 'fill' : 'regular'} /></span>
                {item.label}
                {item.count > 0 && (
                  <span className={`nav-badge ${active ? 'active-badge' : 'gray'}`}>{item.count}</span>
                )}
              </button>

              {item.path === '/opportunities' && isOppsActive && (
                <div style={{ marginLeft: 14, borderLeft: '2px solid rgba(255,255,255,0.12)', paddingLeft: 8, marginTop: 2, marginBottom: 4 }}>
                  {oppsChildren.map(child => {
                    const childActive = location.pathname === child.path
                    return (
                      <button
                        key={child.path}
                        className={`nav-item ${childActive ? 'active' : ''}`}
                        style={{ fontSize: 12.5, padding: '6px 10px' }}
                        onClick={e => { e.stopPropagation(); navigate(child.path) }}
                      >
                        <span className="nav-icon"><child.Icon size={14} weight={childActive ? 'fill' : 'regular'} /></span>
                        {child.label}
                        {child.count > 0 && (
                          <span className={`nav-badge ${childActive ? 'active-badge' : 'gray'}`}>{child.count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Alerts */}
      {(criticalLeads > 0 || overdueTasks > 0) && (
        <div className="sidebar-section">
          <div className="divider" style={{ marginBottom: 8 }} />
          <div className="sidebar-section-label">Alerts</div>
          {criticalLeads > 0 && (
            <div className="alert-item" style={{ background: 'rgba(245,51,63,0.15)' }}>
              <Warning size={13} weight="fill" style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#FCA5A5' }}>
                {criticalLeads} critical lead{criticalLeads > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {overdueTasks > 0 && (
            <div className="alert-item" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Warning size={13} weight="fill" style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#FCD34D' }}>
                {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="status-live" style={{ marginBottom: 8, paddingLeft: 10 }}>
          <div className="dot-live" />LIVE
        </div>
        <div style={{ paddingLeft: 10, marginBottom: 12 }}>
          <Clock />
        </div>

        {/* User */}
        {profile && (
          <div className="user-card" style={{ marginBottom: 8 }}>
            <div className="avatar">
              {(profile.full_name || profile.email || '?').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.full_name || profile.email}
              </div>
              <div className="user-role" style={{ textTransform: 'capitalize' }}>
                {profile.role} · {profile.division}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="nav-item"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="nav-icon"><SignOut size={16} /></span>
          Sign Out
        </button>
      </div>
    </div>
  )
}
