import { useNavigate, useLocation } from 'react-router-dom'
import { ChartBar, Handshake, CheckSquare, ClipboardText, CalendarBlank, UserCircle } from '@phosphor-icons/react'

export default function MobileTabBar({ leads = [], tasks = [] }) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeLeads = leads.filter(l => !['WON ✓', 'LOST ✗'].includes(l.status)).length
  const openTasks   = tasks.filter(t => !t.done).length

  const tabs = [
    { path: '/opportunities',  Icon: ChartBar,      label: 'Ops',           count: activeLeads },
    { path: '/change-orders',  Icon: ClipboardText, label: 'Change Orders', count: 0          },
    { path: '/relationships',  Icon: Handshake,     label: 'Relationships', count: 0          },
    { path: '/tasks',          Icon: CheckSquare,   label: 'Tasks',         count: openTasks  },
    { path: '/ops-board',      Icon: CalendarBlank, label: 'Ops Board',     count: 0          },
    { path: '/profile',        Icon: UserCircle,    label: 'Profile',       count: 0          },
  ]

  return (
    <div className="mobile-tabbar">
      {tabs.map(({ path, Icon, label, count }) => {
        const active = location.pathname === path ||
          (path === '/opportunities' && location.pathname.startsWith('/opportunities'))
        return (
          <button key={path} className={`tab-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}>
            {count > 0 && <div className="tab-badge">{count}</div>}
            <Icon size="1.375rem" weight={active ? 'fill' : 'regular'} color={active ? 'var(--red)' : 'var(--black)'} />
            <span className="tab-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
