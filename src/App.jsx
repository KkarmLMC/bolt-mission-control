import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, SignOut } from '@phosphor-icons/react'
import Sidebar from './components/Sidebar'
import MobileTabBar from './components/MobileTabBar'
import Opportunities from './pages/Opportunities'
import PermitFeed from './pages/PermitFeed'
import Relationships from './pages/Relationships'
import TaskBoard from './pages/TaskBoard'
import LeadModal from './components/modals/LeadModal'
import { TaskModal, RelModal } from './components/modals/OtherModals'
import { useAppData } from './hooks/useAppData'
import { useAuth } from './lib/useAuth.jsx'

const Login         = lazy(() => import('./pages/Login'))
const ChangeOrders  = lazy(() => import('./pages/ChangeOrders'))
const QBImport      = lazy(() => import('./pages/QBImport'))
const Profile       = lazy(() => import('./pages/Profile'))
const OpsBoard      = lazy(() => import('./pages/OpsBoard'))

const PAGE_META = {
  '/opportunities':         { title: 'Opportunities', sub: 'Aggregated view of all active opportunity sources',    parent: null               },
  '/opportunities/permits': { title: 'Permit Feed',   sub: 'Live commercial permit leads from Tampa Bay counties', parent: '/opportunities'    },
  '/relationships':         { title: 'Relationships', sub: 'GC and MEP engineer relationship tracker',             parent: null               },
  '/tasks':                 { title: 'Task Board',    sub: 'Team actions, follow-ups and assignments',             parent: null               },
  '/change-orders':         { title: 'Change Orders', sub: 'Field part requests pending management review',        parent: null               },
  '/qb-import':             { title: 'QB Import',     sub: 'Import Sales Orders from QuickBooks Desktop CSV',     parent: null               },
  '/ops-board':             { title: 'Ops Board',     sub: 'Project schedule and crew deployment overview',        parent: null               },
}

function Header() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { signOut } = useAuth()
  const meta = PAGE_META[location.pathname] || PAGE_META['/opportunities']

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="header" style={{ background: 'var(--navy)', borderBottom: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {meta.parent && (
          <button onClick={() => navigate(meta.parent)}
            style={{ border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
        )}
        <div>
          <div className="header-title" style={{ color: '#fff' }}>{meta.title}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="status-live" style={{ fontSize: 10 }}>
          <div className="dot-live" />LIVE
        </div>
        <button onClick={handleSignOut}
          style={{ border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <SignOut size={16} color="rgba(255,255,255,0.7)" />
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { leads, rels, tasks, loading, saveLead, saveRel, saveTask, toggleTask } = useAppData()
  const [modal, setModal] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const { session, loading: authLoading, profile } = useAuth()

  const handleSaveLead = async (f) => { await saveLead(f); setModal(null) }
  const handleSaveRel  = async (f) => { await saveRel(f);  setModal(null) }
  const handleSaveTask = async (f) => { await saveTask(f); setModal(null) }

  // Auth loading spinner
  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="spinner" />
    </div>
  )

  // No session — show login
  if (!session) return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )

  // PIN guard — if authenticated but no PIN set, force PIN setup before app access
  if (session && profile !== undefined && profile !== null && !profile?.pin_hash) return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login forcePinSetup session={session} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )

  return (
    <div className="app">
      <Sidebar leads={leads} rels={rels} tasks={tasks} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="main">
        <Header />
        <div style={{ flex: 1, overflow: 'hidden', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/opportunities" replace />} />
            <Route path="/opportunities" element={
              <Opportunities leads={leads} loading={loading.permits} />
            } />
            <Route path="/opportunities/permits" element={
              <PermitFeed
                leads={leads}
                loading={loading.permits}
                onAdd={() => setModal({ type: 'lead', data: null })}
                onEdit={l => setModal({ type: 'lead', data: l })}
              />
            } />
            <Route path="/relationships" element={
              <Relationships
                rels={rels}
                loading={loading.rels}
                onAdd={() => setModal({ type: 'rel', data: null })}
                onEdit={r => setModal({ type: 'rel', data: r })}
              />
            } />
            <Route path="/change-orders" element={<ChangeOrders />} />
            <Route path="/qb-import" element={<QBImport />} />
            <Route path="/ops-board" element={<OpsBoard />} />
            <Route path="/tasks" element={
              <TaskBoard
                tasks={tasks}
                loading={loading.tasks}
                onAdd={() => setModal({ type: 'task', data: null })}
                onEdit={t => setModal({ type: 'task', data: t })}
                onToggle={toggleTask}
              />
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/opportunities" replace />} />
          </Routes>
        </div>
      </div>

      <MobileTabBar leads={leads} tasks={tasks} />

      {modal?.type === 'lead' && <LeadModal lead={modal.data} onClose={() => setModal(null)} onSave={handleSaveLead} />}
      {modal?.type === 'rel'  && <RelModal  rel={modal.data}  onClose={() => setModal(null)} onSave={handleSaveRel}  />}
      {modal?.type === 'task' && <TaskModal task={modal.data} onClose={() => setModal(null)} onSave={handleSaveTask} />}
    </div>
  )
}
