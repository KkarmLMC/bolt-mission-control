import { useState } from 'react'
import {
  ListChecks, CalendarBlank, Warning, CheckCircle, Check,
} from '@phosphor-icons/react'
import { today, dueClass, dueLabel } from '../lib/utils'
import FAB from '../components/FAB'

export default function TaskBoard({ tasks, loading, onAdd, onEdit, onToggle }) {
  const [filter, setFilter]     = useState('ALL')
  const [assigneeF, setAssigneeF] = useState('ALL')

  const t0 = today()
  const filtered = tasks.filter(t => {
    const mf =
      filter === 'ALL'    ||
      (filter === 'OPEN'    && !t.done) ||
      (filter === 'TODAY'   && t.due_date === t0) ||
      (filter === 'OVERDUE' && t.due_date < t0 && !t.done) ||
      (filter === 'DONE'    && t.done)
    const ma = assigneeF === 'ALL' || t.assigned_to === assigneeF
    return mf && ma
  })

  const overdue  = tasks.filter(t => !t.done && t.due_date && t.due_date < t0).length
  const dueToday = tasks.filter(t => !t.done && t.due_date === t0).length

  return (
    <div className="page fade-in">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Open Tasks</span><div className="stat-icon blue"><ListChecks size={16} weight="bold" style={{ color: 'var(--blue)' }} /></div></div>
          <div className="stat-value blue">{tasks.filter(t => !t.done).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Due Today</span><div className="stat-icon amber"><CalendarBlank size={16} weight="bold" style={{ color: 'var(--amber)' }} /></div></div>
          <div className="stat-value amber">{dueToday}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Overdue</span><div className="stat-icon red"><Warning size={16} weight="fill" style={{ color: 'var(--red)' }} /></div></div>
          <div className="stat-value red">{overdue}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top"><span className="stat-label">Completed</span><div className="stat-icon green"><CheckCircle size={16} weight="fill" style={{ color: 'var(--green)' }} /></div></div>
          <div className="stat-value green">{tasks.filter(t => t.done).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <span className="card-dot" style={{ background: 'var(--green)', width: 8, height: 8, borderRadius: 2, display: 'inline-block' }} />
            Task Board
          </span>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add Task</button>
        </div>

        <div style={{ padding: '10px 12px 0' }}>
          <div className="filter-bar">
            {['ALL','OPEN','TODAY','OVERDUE','DONE'].map(f => (
              <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="filter-bar" style={{ paddingTop: 0 }}>
            {['ALL','Kodylee','Shaun','Field Crew'].map(a => (
              <button key={a} className={`filter-pill ${assigneeF === a ? 'active' : ''}`} onClick={() => setAssigneeF(a)}>{a}</button>
            ))}
          </div>
        </div>

        <div className="card-body" style={{ paddingTop: 4 }}>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <CheckCircle size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div className="empty-title">No tasks here</div>
              <div className="empty-desc">Add tasks to track follow-ups, calls, and actions.</div>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onAdd}>+ Add First Task</button>
            </div>
          ) : filtered.map(t => (
            <div key={t.id} className="task-row" style={{ opacity: t.done ? 0.55 : 1 }} onClick={() => onEdit(t)}>
              <div
                className={`checkbox ${t.done ? 'checked' : ''}`}
                onClick={e => { e.stopPropagation(); onToggle(t) }}
              >
                {t.done && <Check size={10} weight="bold" style={{ color: 'white' }} />}
              </div>
              <div className="task-body">
                <div className={`task-title ${t.done ? 'done' : ''}`}>{t.title}</div>
                {t.related_to && <div className="task-sub">Re: {t.related_to}</div>}
                <div className="task-meta">
                  <span className="assignee-chip">{t.assigned_to}</span>
                  <span className={`due-tag ${dueClass(t.due_date)}`}>{dueLabel(t.due_date)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: t.priority === 'CRITICAL' ? 'var(--red)' : t.priority === 'HIGH' ? 'var(--amber)' : 'var(--text-3)' }}>
                    {t.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FAB onClick={onAdd} />
    </div>
  )
}
