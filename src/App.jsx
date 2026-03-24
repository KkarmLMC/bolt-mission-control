import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import PermitFeed from './pages/PermitFeed'
import Pipeline from './pages/Pipeline'
import Relationships from './pages/Relationships'
import TaskBoard from './pages/TaskBoard'
import LeadModal from './components/modals/LeadModal'
import { TaskModal, RelModal } from './components/modals/OtherModals'
import { useAppData } from './hooks/useAppData'

const PAGE_META = {
  '/':              { title: 'Permit Feed',    sub: 'Live commercial permit leads from Tampa Bay counties'         },
  '/pipeline':      { title: 'Pipeline',       sub: 'Track opportunities from first contact to closed contract'    },
  '/relationships': { title: 'Relationships',  sub: 'GC and MEP engineer relationship tracker'                    },
  '/tasks':         { title: 'Task Board',     sub: 'Team actions, follow-ups and assignments'                    },
}

export default function App() {
  const { leads, rels, tasks, loading, setupNeeded, saveLead, saveRel, saveTask, toggleTask } = useAppData()
  const [modal, setModal] = useState(null)

  const currentPath = window.location.pathname
  const meta = PAGE_META[currentPath] || PAGE_META['/']

  const handleSaveLead = async (f) => { await saveLead(f); setModal(null) }
  const handleSaveRel  = async (f) => { await saveRel(f);  setModal(null) }
  const handleSaveTask = async (f) => { await saveTask(f); setModal(null) }

  return (
    <div className="app">
      <Sidebar leads={leads} rels={rels} tasks={tasks} />

      <div className="main">
        <div className="header">
          <div>
            <div className="header-title">{meta.title}</div>
            <div className="header-sub">{meta.sub}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={
              <PermitFeed
                leads={leads}
                loading={loading.permits}
                onAdd={() => setModal({ type: 'lead', data: null })}
                onEdit={l => setModal({ type: 'lead', data: l })}
              />
            } />
            <Route path="/pipeline" element={
              <Pipeline
                leads={leads}
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {modal?.type === 'lead' && <LeadModal lead={modal.data} onClose={() => setModal(null)} onSave={handleSaveLead} />}
      {modal?.type === 'rel'  && <RelModal  rel={modal.data}  onClose={() => setModal(null)} onSave={handleSaveRel}  />}
      {modal?.type === 'task' && <TaskModal task={modal.data} onClose={() => setModal(null)} onSave={handleSaveTask} />}
    </div>
  )
}
