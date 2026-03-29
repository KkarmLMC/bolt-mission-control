import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChartBar, Handshake, CheckSquare, Lightning,
  Warning, SignOut, ClipboardText, DownloadSimple,
  CalendarBlank, ArrowLineLeft, ArrowLineRight, User,
} from '@phosphor-icons/react'
import { useAuth } from '../lib/useAuth.jsx'

// ── Live clock ────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font)' }}>
      {t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      {' · '}
      {t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pathMatch(itemPath, currentPath) {
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/')
}

function groupIsActive(item, currentPath) {
  if (pathMatch(item.path, currentPath)) return true
  return item.children?.some(c => pathMatch(c.path, currentPath)) ?? false
}

// ── Sub-nav ───────────────────────────────────────────────────────────────────
function SubNav({ children, collapsed, goTo, currentPath }) {
  return (
    <div style={{ overflow: 'hidden', marginTop: 2 }}>
      <div style={{ position: 'relative', paddingLeft: 4 }}>
        <div style={{
          position: 'absolute', left: '1.375rem', top: 4, bottom: 4,
          width: 1, background: 'var(--border-l)', borderRadius: 1,
        }} />
        {children.map(child => {
          const active = pathMatch(child.path, currentPath)
          return (
            <button
              key={child.path}
              className={`sidebar-item sidebar-sub-item ${active ? 'sidebar-item--active' : ''}`}
              onClick={() => goTo(child.path)}
              title={collapsed ? child.label : undefined}
              style={{ marginBottom: 1 }}
            >
              <child.Icon size={14} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span className="sidebar-item-label">
                  {child.label}
                  {child.count > 0 && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 10,
                      background: active ? 'var(--red)' : 'rgba(255,255,255,0.15)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontFamily: 'var(--mono)',
                    }}>{child.count}</span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Nav group ─────────────────────────────────────────────────────────────────
function NavGroup({ item, collapsed, goTo, currentPath }) {
  const active      = groupIsActive(item, currentPath)
  const hasChildren = item.children?.length > 0

  return (
    <>
      <button
        className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
        onClick={() => goTo(item.path)}
        title={collapsed ? item.label : undefined}
      >
        <item.Icon size={17} weight={active ? 'fill' : 'regular'} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <span className="sidebar-item-label" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {item.label}
            {item.count > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10,
                background: active ? 'var(--navy)' : 'var(--hover)',
                color: active ? '#fff' : 'var(--text-2)',
                fontFamily: 'var(--font)',
              }}>{item.count}</span>
            )}
          </span>
        )}
        {collapsed && active && (
          <div style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: 'var(--navy)',
          }} />
        )}
      </button>

      {hasChildren && active && !collapsed && (
        <SubNav
          children={item.children}
          collapsed={collapsed}
          goTo={goTo}
          currentPath={currentPath}
        />
      )}
    </>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle, leads = [], rels = [], tasks = [] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const goTo = (path) => navigate(path)

  const newLeads      = leads.filter(l => l.status === 'NEW LEAD').length
  const activeLeads   = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status)).length
  const openTasks     = tasks.filter(t => !t.done).length
  const overdueTasks  = tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
  const criticalLeads = leads.filter(l => l.priority?.includes('CRITICAL')).length

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const NAV_ITEMS = [
    { path: '/opportunities',  Icon: ChartBar,       label: 'Opportunities', count: activeLeads,
      children: [
        { path: '/opportunities/permits', Icon: Lightning, label: 'Permit Feed', count: newLeads },
      ],
    },
    { path: '/change-orders',  Icon: ClipboardText,  label: 'Change Orders', count: 0           },
    { path: '/ops-board',      Icon: CalendarBlank,  label: 'Ops Board',     count: 0           },
    { path: '/relationships',  Icon: Handshake,      label: 'Relationships', count: rels.length },
    { path: '/tasks',          Icon: CheckSquare,    label: 'Task Board',    count: openTasks   },
    { path: '/qb-import',      Icon: DownloadSimple, label: 'QB Import',     count: 0           },
  ]

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Logo */}
        <div className="sidebar-brand-row">
          {collapsed
            ? <Lightning size={22} weight="fill" style={{ color: 'var(--navy)' }} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
                  Mission Control
                </div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Bolt LP · LMC
                </div>
              </div>
            )
          }
        </div>

        {/* Main nav */}
        <nav className="sidebar-nav">
          {!collapsed && <div className="sidebar-section-label">MENU</div>}

          {NAV_ITEMS.map(item => (
            <NavGroup
              key={item.path}
              item={item}
              collapsed={collapsed}
              goTo={goTo}
              currentPath={location.pathname}
            />
          ))}
        </nav>

        {/* Alerts — only show when not collapsed and there are alerts */}
        {!collapsed && (criticalLeads > 0 || overdueTasks > 0) && (
          <div style={{ padding: 'var(--sp-2)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div className="sidebar-section-label">ALERTS</div>
            {criticalLeads > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, marginBottom: 4, background: 'rgba(245,51,63,0.15)' }}>
                <Warning size={13} weight="fill" style={{ color: 'var(--red)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>
                  {criticalLeads} critical lead{criticalLeads > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {overdueTasks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, marginBottom: 4, background: 'rgba(245,158,11,0.15)' }}>
                <Warning size={13} weight="fill" style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>
                  {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer-nav">
          {!collapsed && <div className="sidebar-section-label">ACCOUNT</div>}

          {/* Live clock — only expanded */}
          {!collapsed && (
            <div style={{ padding: '4px 0.625rem 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'livepulse 2s infinite', flexShrink: 0 }} />
              <Clock />
            </div>
          )}

          {/* User profile */}
          {/* Profile */}
          <button onClick={() => navigate('/profile')} className={`sidebar-item ${location.pathname === '/profile' ? 'sidebar-item--active' : ''}`} title={collapsed ? 'View Profile' : undefined}>
            <User size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span className="sidebar-item-label">View Profile</span>}
          </button>

          {/* Sign out */}
          <button onClick={handleSignOut} className="sidebar-item"
            title={collapsed ? 'Sign Out' : undefined}
            >
            <SignOut size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span className="sidebar-item-label">Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button className="sidebar-item sidebar-collapse-btn" onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed
              ? <ArrowLineRight size={17} style={{ flexShrink: 0 }} />
              : <ArrowLineLeft  size={17} style={{ flexShrink: 0 }} />}
            {!collapsed && <span className="sidebar-item-label">Collapse</span>}
          </button>
        </div>

      </aside>
    </>
  )
}
