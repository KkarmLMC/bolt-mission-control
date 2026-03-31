/**
 * MC Sidebar — Config wrapper
 * All rendering is delegated to the shared ui/navigation/Sidebar.
 * This file owns: nav items (with dynamic counts), alerts, auth, clock.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChartBar, Handshake, CheckSquare, Lightning,
  Warning, SignOut, ClipboardText, DownloadSimple,
  CalendarBlank, ArrowLineLeft, ArrowLineRight, User, UserGear, Receipt } from '@phosphor-icons/react'
import { useAuth } from '../lib/useAuth.jsx'
import { Sidebar as SharedSidebar } from './ui'

// ─── Clock ───────────────────────────────────────────────────────────────────

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return (
    <span className="sidebar-clock__text">
      {t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      {' · '}
      {t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    </span>
  )
}

// ─── Sidebar (config wrapper) ────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle, leads = [], rels = [], tasks = [] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const newLeads      = leads.filter(l => l.status === 'NEW LEAD').length
  const activeLeads   = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status)).length
  const openTasks     = tasks.filter(t => !t.done).length
  const overdueTasks  = tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
  const criticalLeads = leads.filter(l => l.priority?.includes('CRITICAL')).length

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  // ── Nav items with dynamic counts ──

  const navItems = [
    { path: '/opportunities',  Icon: ChartBar,       label: 'Opportunities', count: activeLeads,
      children: [
        { path: '/opportunities/permits', Icon: Lightning, label: 'Permit Feed', count: newLeads },
      ] },
    { path: '/change-orders',  Icon: ClipboardText,  label: 'Change Orders' },
    { path: '/sales-orders',   Icon: Receipt,        label: 'Sales Orders' },
    { path: '/ops-board',      Icon: CalendarBlank,  label: 'Ops Board' },
    { path: '/relationships',  Icon: Handshake,      label: 'Relationships', count: rels.length },
    { path: '/tasks',          Icon: CheckSquare,    label: 'Task Board',    count: openTasks },
    { path: '/qb-import',      Icon: DownloadSimple, label: 'QB Import' },
    ...(profile?.role === 'admin' ? [{ path: '/users', Icon: UserGear, label: 'Users' }] : []),
  ]

  // ── Alerts slot (between nav and footer) ──

  const afterNavSlot = !collapsed && (criticalLeads > 0 || overdueTasks > 0) ? (
    <div className="sidebar-alerts">
      <div className="sidebar-section-label">ALERTS</div>
      {criticalLeads > 0 && (
        <div className="sidebar-alert sidebar-alert--error">
          <Warning size="0.8125rem" weight="fill" />
          {criticalLeads} critical lead{criticalLeads > 1 ? 's' : ''}
        </div>
      )}
      {overdueTasks > 0 && (
        <div className="sidebar-alert sidebar-alert--warning">
          <Warning size="0.8125rem" weight="fill" />
          {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}
        </div>
      )}
    </div>
  ) : null

  // ── Footer slot ──

  const footerSlot = (
    <div className="sidebar-account-row">
      <span className="sidebar-section-label">ACCOUNT</span>
      <div className="sidebar-clock">
        <div className="sidebar-clock__dot" />
        <Clock />
      </div>
    </div>
  )

  const footerItems = [
    { path: '/profile', Icon: User,    label: 'View Profile' },
    { path: null,       Icon: SignOut,  label: 'Sign Out', onClick: handleSignOut },
  ]

  const collapseIcons = {
    expanded:  <ArrowLineLeft  size="1.0625rem" />,
    collapsed: <ArrowLineRight size="1.0625rem" />,
  }

  return (
    <SharedSidebar
      collapsed={collapsed}
      onToggle={onToggle}
      items={navItems}
      footerItems={footerItems}
      brand={{
        name: 'Mission Control',
        subtitle: 'Bolt LP · LMC',
        icon: Lightning,
      }}
      currentPath={location.pathname}
      onNavigate={navigate}
      afterNavSlot={afterNavSlot}
      footerSlot={footerSlot}
      collapseIcons={collapseIcons}
    />
  )
}
