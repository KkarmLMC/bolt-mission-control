import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
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

const Login = lazy(() => import('./pages/Login'))

const PAGE_META = {
  '/opportunities':         { title: 'Opportunities', sub: 'Aggregated view of all active opportunity sources',    parent: null               },
  '/opportunities/permits': { title: 'Permit Feed',   sub: 'Live commercial permit leads from Tampa Bay counties', parent: '/opportunities'    },
  '/relationships':         { title: 'Relationships', sub: 'GC and MEP engineer relationship tracker',             parent: null               },
  '/tasks':                 { title: 'Task Board',    sub: 'Team actions, follow-ups and assignments',             parent: null               },
}

function Header() {
  const location = useLocation()
  const navigate  = useNavigate()
  const meta = PAGE_META[location.pathname] || PAGE_META['/opportunities']

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Back arrow — only shown on mobile when there's a parent route */}
        {meta.parent && (
          <button onClick={() => navigate(meta.parent)} className="back-btn" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <div className="header-title">{meta.title}</div>
          <div className="header-sub">{meta.sub}</div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { leads, rels, tasks, loading, saveLead, saveRel, saveTask, toggleTask } = useAppData()
  const [modal, setModal] = useState(null)
  const { session, loading: authLoading } = useAuth()

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

  return (
    <div className="app">
      <Sidebar leads={leads} rels={rels} tasks={tasks} />

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
            <Route path="/tasks" element={
              <TaskBoard
                tasks={tasks}
                loading={loading.tasks}
                onAdd={() => setModal({ type: 'task', data: null })}
                onEdit={t => setModal({ type: 'task', data: t })}
                onToggle={toggleTask}
              />
            } />
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
