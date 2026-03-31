import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChartBar, Handshake, CheckSquare, Lightning,
  Warning, SignOut, ClipboardText, DownloadSimple,
  CalendarBlank, ArrowLineLeft, ArrowLineRight, User, UserGear, Receipt } from '@phosphor-icons/react'
import { useAuth } from '../lib/useAuth.jsx'
import { Sidebar as SharedSidebar } from '../components/ui'

// ── Live clock ────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <span className="sidebar-clock__text">
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
          width: 1, background: 'var(--border-subtle)', borderRadius: 'var(--radius-xs)' }} />
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
              <child.Icon size="0.875rem" style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span className="sidebar-item-label">
                  {child.label}
                  {child.count > 0 && (
                    <span style={{
                      marginLeft: 6, fontSize: 'var(--text-xs)', fontWeight: 700,
                      padding: '1px 6px', borderRadius: 'var(--radius-m)',
                      background: active ? 'var(--state-error)' : 'rgba(255,255,255,0.15)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontFamily: 'var(--mono)' }}>{child.count}</span>
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
        <item.Icon size="1.0625rem" weight={active ? 'fill' : 'regular'} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <span className="sidebar-item-label" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {item.label}
            {item.count > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: 'var(--text-xs)', fontWeight: 700,
                padding: '1px 6px', borderRadius: 'var(--radius-m)',
                background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface-hover)',
                color: active ? 'var(--surface-base)' : 'var(--text-primary)',
                fontFamily: 'var(--font)' }}>{item.count}</span>
            )}
          </span>
        )}
        {collapsed && active && (
          <div style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: 'var(--white)' }} />
        )}
      </button>

      {hasChildren && !collapsed && (
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
      ] },
    { path: '/change-orders',  Icon: ClipboardText,  label: 'Change Orders', count: 0           },
    { path: '/sales-orders',   Icon: Receipt,        label: 'Sales Orders',  count: 0           },
    { path: '/ops-board',      Icon: CalendarBlank,  label: 'Ops Board',     count: 0           },
    { path: '/relationships',  Icon: Handshake,      label: 'Relationships', count: rels.length },
    { path: '/tasks',          Icon: CheckSquare,    label: 'Task Board',    count: openTasks   },
    { path: '/qb-import',      Icon: DownloadSimple, label: 'QB Import',     count: 0           },
    ...(profile?.role === 'admin' ? [{ path: '/users', Icon: UserGear, label: 'Users', count: 0 }] : []),
  ]

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Logo */}
        <div className="sidebar-brand-row">
          {collapsed
            ? <Lightning size="1.375rem" weight="fill" style={{ color: 'var(--brand-primary)' }} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Mission Control
                </div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>
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
          <div style={{ padding: 'var(--space-s)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div className="sidebar-section-label">ALERTS</div>
            {criticalLeads > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-s)', marginBottom: 4, background: 'var(--state-error-soft)' }}>
                <Warning size="0.8125rem" weight="fill" style={{ color: 'var(--state-error-text)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--state-error-text)' }}>
                  {criticalLeads} critical lead{criticalLeads > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {overdueTasks > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-s)', marginBottom: 4, background: 'var(--state-warning-soft)' }}>
                <Warning size="0.8125rem" weight="fill" style={{ color: 'var(--state-warning-text)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--state-warning-text)' }}>
                  {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer-nav">
          {!collapsed && (
            <div className="sidebar-footer-header">
              <span className="sidebar-section-label" style={{ padding: 0 }}>ACCOUNT</span>
              <div className="sidebar-clock">
                <div className="sidebar-clock__dot" />
                <Clock />
              </div>
            </div>
          )}
          {collapsed && <div style={{ height: '0.25rem' }} />}

          {/* Profile */}
          <button onClick={() => navigate('/profile')} className={`sidebar-item ${location.pathname === '/profile' ? 'sidebar-item--active' : ''}`} title={collapsed ? 'View Profile' : undefined}>
            <User size="1.0625rem" style={{ flexShrink: 0 }} />
            {!collapsed && <span className="sidebar-item-label">View Profile</span>}
          </button>

          {/* Sign out */}
          <button onClick={handleSignOut} className="sidebar-item"
            title={collapsed ? 'Sign Out' : undefined}
            >
            <SignOut size="1.0625rem" style={{ flexShrink: 0 }} />
            {!collapsed && <span className="sidebar-item-label">Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button className="sidebar-item sidebar-collapse-btn" onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed
              ? <ArrowLineRight size="1.0625rem" style={{ flexShrink: 0 }} />
              : <ArrowLineLeft  size="1.0625rem" style={{ flexShrink: 0 }} />}
            {!collapsed && <span className="sidebar-item-label">Collapse</span>}
          </button>
        </div>

      </aside>
    </>
  )
}
