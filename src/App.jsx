import { useState, useEffect, lazy, Suspense } from 'react'
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
import { ReloadPrompt } from './components/ReloadPrompt'
import { OfflineBanner } from './components/OfflineBanner'
import { subscribeToPush } from './lib/push'

const Login         = lazy(() => import('./pages/Login'))
const ChangeOrders  = lazy(() => import('./pages/ChangeOrders'))
const QBImport      = lazy(() => import('./pages/QBImport'))
const Profile       = lazy(() => import('./pages/Profile'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const SalesOrders    = lazy(() => import('./pages/SalesOrders'))
const SODetail       = lazy(() => import('./pages/SODetail'))
const SONew          = lazy(() => import('./pages/SONew'))
const OpsBoard      = lazy(() => import('./pages/OpsBoard'))

const PAGE_META = {
  '/opportunities':         { title: 'Opportunities', sub: 'Aggregated view of all active opportunity sources',    parent: null               },
  '/opportunities/permits': { title: 'Permit Feed',   sub: 'Live commercial permit leads from Tampa Bay counties', parent: '/opportunities'    },
  '/relationships':         { title: 'Relationships', sub: 'GC and MEP engineer relationship tracker',             parent: null               },
  '/tasks':                 { title: 'Task Board',    sub: 'Team actions, follow-ups and assignments',             parent: null               },
  '/change-orders':         { title: 'Change Orders', sub: 'Field part requests pending management review',        parent: null               },
  '/sales-orders':          { title: 'Sales Orders', parent: null },
  '/sales-orders/new':      { title: 'New Sales Order', parent: '/sales-orders' },
  '/qb-import':             { title: 'QB Import',     sub: 'Import Sales Orders from QuickBooks Desktop CSV',     parent: null               },
  '/ops-board':             { title: 'Ops Board',     sub: 'Project schedule and crew deployment overview',        parent: null               } }

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
    <div className="page-header">
      <div className="page-header__actions">
        {meta.parent && (
          <button className="page-header__icon-btn" onClick={() => navigate(meta.parent)}>
            <ArrowLeft size="1.125rem" color="var(--color-white)" />
          </button>
        )}
        <div className="page-header__title">{meta.title}</div>
      </div>
      <div className="page-header__actions">
        <div className="status-live">
          <div className="dot-live" />LIVE
        </div>
        <button className="page-header__icon-btn" onClick={handleSignOut}>
          <SignOut size="1rem" color="rgba(255,255,255,0.7)" />
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

  // Re-subscribe to push on every authenticated app launch
  useEffect(() => {
    if (!session) return;
    async function ensureSubscription() {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      await subscribeToPush();
    }
    ensureSubscription();
  }, [session])

  // Auth loading spinner
  if (authLoading) return (
    <div className="spinner-page">
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

  // PIN guard — loading covers both session + profile loading
  // When we reach here, profile is fully loaded. If no pin_hash → force setup
  if (session && !profile?.pin_hash) return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login forcePinSetup session={session} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )

  return (
    <div className="app-shell">
      <Sidebar leads={leads} rels={rels} tasks={tasks} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="main-area">
        <Header />
        <Suspense fallback={<div className="page-content spinner-content"><div className="spinner" /></div>}>
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
            <Route path="/users" element={<UserManagement />} />
            <Route path="/sales-orders" element={<SalesOrders />} />
            <Route path="/sales-orders/new" element={<SONew />} />
            <Route path="/sales-orders/:id" element={<SODetail />} />
            <Route path="*" element={<Navigate to="/opportunities" replace />} />
          </Routes>
        </Suspense>
        <MobileTabBar leads={leads} tasks={tasks} />
      </div>

      {modal?.type === 'lead' && <LeadModal lead={modal.data} onClose={() => setModal(null)} onSave={handleSaveLead} />}
      {modal?.type === 'rel'  && <RelModal  rel={modal.data}  onClose={() => setModal(null)} onSave={handleSaveRel}  />}
      {modal?.type === 'task' && <TaskModal task={modal.data} onClose={() => setModal(null)} onSave={handleSaveTask} />}

      <OfflineBanner />
      <ReloadPrompt />
    </div>
  )
}
