import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarBlank, Rows, ArrowLeft, ArrowRight,
  Users, Buildings, Warning, CheckCircle,
  Clock, Lightning, Wrench, MagnifyingGlass,
  CaretLeft, CaretRight, X, PencilSimple,
  Plus, ArrowSquareOut } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { logActivity } from '../lib/logActivity.js'
import { projectStage } from '../lib/statusColors.js'
import { Card, Button, Badge } from '../components/ui'

// ─── Date helpers ──────────────────────────────────────────────────────────────
const today     = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const fmtDate   = (d) => d.toISOString().slice(0,10)
const parseDate = (s) => { if (!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d }
const addDays   = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const isSameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
const isWeekend = (d) => d.getDay() === 0
const getDaysInRange = (start, count) => Array.from({ length: count }, (_, i) => addDays(start, i))

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Stage config — thin wrapper over statusColors.js tokens ──────────────────
const STAGES_LIST = ['Awarded','Scheduled','In Progress','Inspection','Completion','Customer Sign-Off','Postponed','Complete','Cancelled','Hold']

// STAGES map: uses projectStage() tokens so colors stay in sync with design system
const STAGES = Object.fromEntries(
  STAGES_LIST.map(s => [s, projectStage(s)])
)

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Stage Badge ───────────────────────────────────────────────────────────────
function StageBadge({ stage, small }) {
  const s = STAGES[stage] || STAGES['Awarded']
  return (
    <span style={{
      padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 'var(--radius-xs)',
      fontSize: small ? 'var(--text-2xs)' : 'var(--text-xs)',
      fontWeight: 'var(--fw-bold)',
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap' }}>{s.label}</span>
  )
}

// ─── Job Detail Panel ──────────────────────────────────────────────────────────
function JobPanel({ project, assignments, onClose, onSave }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    stage:            project.stage || 'Awarded',
    scheduled_date:   project.scheduled_date || '',
    target_completion: project.target_completion || '',
    notes:            project.notes || '' })
  const [saving, setSaving] = useState(false)

  const stage = STAGES[form.stage] || STAGES['Awarded']
  const crew  = assignments.filter(a => a.project_id === project.id)

  const handleSave = async () => {
    setSaving(true)
    await db.from('projects').update(form).eq('id', project.id)
    logActivity(db, undefined, 'mission_control', {
      category:    'sales_order',
      action:      'project_updated',
      label:       `Updated project: ${form.name || project.name}`,
      entity_type: 'project',
      entity_id:   project.id,
      meta:        { stage: form.stage } })
    setSaving(false)
    setEditing(false)
    onSave({ ...project, ...form })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 'env(safe-area-inset-bottom, 0px)',
      width: 360, background: 'var(--surface-base)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.2s ease' }}>
      {/* Header */}
      <div className="ops-board-ec6b">
        <div className="ops-board-c353">
          <StageBadge stage={project.stage} />
          <div className="flex-gap-s">
            <button onClick={() => setEditing(e => !e)} className="ops-board-643f">
              <PencilSimple size="0.8125rem" />
            </button>
            <button onClick={onClose} className="ops-board-643f">
              <X size="0.8125rem" />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--fw-black)', color: 'var(--color-white)', lineHeight: 'var(--leading-snug)', marginBottom: 'var(--space-2xs)' }}>
          {project.name}
        </div>
        <div className="ops-board-17b3">
          {project.customer_account} · {project.city}{project.state ? `, ${project.state}` : ''}
        </div>
      </div>

      {/* Content */}
      <div className="ops-board-2b21">

        {editing ? (
          <div className="modal-body">
            <div>
              <label className="form-field__label">Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid-2col">
              <div>
                <label className="form-field__label">Start Date</label>
                <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-field__label">End Date</label>
                <input type="date" value={form.target_completion} onChange={e => setForm(f => ({ ...f, target_completion: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="form-field__label">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex-gap-s">
              <button onClick={() => setEditing(false)} className="ops-board-96a7">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="ops-board-c6e6">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Key info */}
            <div className="grid-2col mb-l">
              {[
                ['SO Number',   project.job_number || '—'],
                ['Contract',    project.contract_value ? `$${Number(project.contract_value).toLocaleString()}` : '—'],
                ['Start',       project.scheduled_date || '—'],
                ['End',         project.target_completion || '—'],
              ].map(([lbl, val]) => (
                <div key={lbl} className="card-section">
                  <div className="text-label">{lbl}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', fontFamily: lbl === 'Contract' || lbl === 'SO Number' ? 'var(--mono)' : 'var(--font)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Assigned crew */}
            <div className="mb-l">
              <div className="text-label">
                Assigned Crew
              </div>
              {crew.length === 0 ? (
                <div className="ops-board-7506">No crew assigned yet</div>
              ) : crew.map(a => (
                <div key={a.id} className="ops-board-ff9d">
                  <div className="ops-board-4dda">
                    {getInitials(a.crew_name)}
                  </div>
                  <div className="content-body">
                    <div className="text-sm-semi">{a.crew_name}</div>
                    <div className="meta-text">{a.role}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            {project.notes && (
              <div className="mb-l">
                <div className="text-label">Notes</div>
                <div className="card-section">
                  {project.notes}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!editing && (
        <div className="pad-l">
          <button onClick={() => navigate(`/installations/${project.id}`)}
            className="ops-board-c8bb">
            Open Job Page <ArrowSquareOut size="0.875rem" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Gantt View ────────────────────────────────────────────────────────────────
function GanttView({ projects, assignments, days, onSelectProject }) {
  const tod = today()

  return (
    <div className="ops-board-d7ef">
      <div style={{ minWidth: 160 + days.length * 38 }}>
        {/* Header row */}
        <div className="ops-board-4042">
          <div className="ops-board-97e8">
            JOB
          </div>
          {days.map(d => {
            const isToday = isSameDay(d, tod)
            const isSun = isWeekend(d)
            return (
              <div key={fmtDate(d)} style={{
                width: 38, flexShrink: 0, padding: '4px 2px', textAlign: 'center',
                background: isToday ? 'var(--navy)' : isSun ? 'var(--white)' : 'transparent',
                borderRight: '1px solid var(--border-l)' }}>
                <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-bold)', color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-primary)' }}>
                  {DAY_NAMES[d.getDay()]}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: isToday ? '#fff' : isSun ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Job rows */}
        {projects.map((proj, pi) => {
          const start = parseDate(proj.scheduled_date)
          const end   = parseDate(proj.target_completion)
          const stage = STAGES[proj.stage] || STAGES['Awarded']
          const crew  = assignments.filter(a => a.project_id === proj.id)

          return (
            <div key={proj.id} style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', minHeight: 'var(--touch-target)', alignItems: 'center', background: pi % 2 === 0 ? 'transparent' : 'var(--surface-base)' }}>
              {/* Job name column */}
              <div className="ops-board-09d7"
                onClick={() => onSelectProject(proj)}>
                <div className="ops-board-4919">
                  {proj.name.split(' — ')[0]}
                </div>
                <div className="ops-board-c5b4">
                  <StageBadge stage={proj.stage} small />
                </div>
              </div>

              {/* Day cells */}
              {days.map(d => {
                const isToday   = isSameDay(d, tod)
                const isInRange = start && end && d >= start && d <= end
                const isStart   = start && isSameDay(d, start)
                const isEnd     = end   && isSameDay(d, end)
                const isSun     = isWeekend(d)

                return (
                  <div key={fmtDate(d)} style={{
                    width: 38, flexShrink: 0, height: 44,
                    background: isSun && !isInRange ? 'rgba(0,0,0,0.02)' : 'transparent',
                    borderRight: '1px solid var(--border-l)',
                    position: 'relative',
                    borderLeft: isToday ? '2px solid var(--navy)' : 'none' }}>
                    {isInRange && (
                      <div
                        onClick={() => onSelectProject(proj)}
                        style={{
                          position: 'absolute', top: 8, bottom: 8, left: 0, right: 0,
                          background: stage.color,
                          borderRadius: isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0,
                          marginLeft: isStart ? 3 : 0,
                          marginRight: isEnd ? 3 : 0,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                          opacity: 0.85 }}>
                        {isStart && (
                          <div className="ops-board-1878">
                            {crew.slice(0, 3).map(a => (
                              <div key={a.id} title={a.crew_name} className="ops-board-e09e">
                                {getInitials(a.crew_name)[0]}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Crew Board View ───────────────────────────────────────────────────────────
function CrewBoardView({ projects, assignments, fieldLogs, days, onSelectProject }) {
  const tod = today()

  // Get unique crew from assignments
  const crewMap = new Map()
  assignments.forEach(a => {
    if (!crewMap.has(a.crew_name)) crewMap.set(a.crew_name, { name: a.crew_name, id: a.crew_id })
  })
  const crew = Array.from(crewMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  // For each crew+day: find assigned project(s) and actual field log project
  const getAssigned = (crewName, day) => {
    const d = fmtDate(day)
    return assignments.filter(a => {
      if (a.crew_name !== crewName) return false
      const s = a.start_date || ''
      const e = a.end_date || ''
      return s <= d && d <= e
    }).map(a => projects.find(p => p.id === a.project_id)).filter(Boolean)
  }

  const getActual = (crewName, day) => {
    const d = fmtDate(day)
    return fieldLogs.filter(fl => fl.report_date === d && (fl.crew_members || []).includes(crewName))
  }

  return (
    <div className="ops-board-d7ef">
      <div style={{ minWidth: 140 + days.length * 80 }}>
        {/* Header */}
        <div className="ops-board-20c3">
          <div className="ops-board-f463">
            CREW
          </div>
          {days.map(d => {
            const isToday = isSameDay(d, tod)
            const isSun = isWeekend(d)
            return (
              <div key={fmtDate(d)} style={{
                width: 80, flexShrink: 0, padding: '4px 8px', textAlign: 'center',
                background: isToday ? 'var(--brand-primary)' : isSun ? 'var(--surface-base)' : 'transparent',
                borderRight: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-primary)' }}>
                  {DAY_NAMES[d.getDay()]} {d.getDate()}
                </div>
                <div style={{ fontSize: 'var(--text-2xs)', color: isToday ? 'rgba(255,255,255,0.5)' : 'var(--text-4)' }}>
                  {MON_NAMES[d.getMonth()]}
                </div>
              </div>
            )
          })}
        </div>

        {/* Crew rows */}
        {crew.map((c, ci) => (
          <div key={c.name} style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', minHeight: 'var(--touch-target-lg)', alignItems: 'stretch', background: ci % 2 === 0 ? 'transparent' : 'var(--surface-base)' }}>
            {/* Crew name */}
            <div className="ops-board-81e5">
              <div className="ops-board-4dda">
                {getInitials(c.name)}
              </div>
              <div className="text-sm-truncate">
                {c.name.split(' ')[0]}
              </div>
            </div>

            {/* Day cells */}
            {days.map(d => {
              const assigned = getAssigned(c.name, d)
              const actual   = getActual(c.name, d)
              const conflict = assigned.length > 1
              const isSun    = isWeekend(d)
              const isToday  = isSameDay(d, tod)

              return (
                <div key={fmtDate(d)} style={{
                  width: 80, flexShrink: 0,
                  background: isSun ? 'rgba(0,0,0,0.02)' : 'transparent',
                  borderRight: '1px solid var(--border-subtle)',
                  borderLeft: isToday ? '2px solid var(--brand-primary)' : 'none',
                  padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {assigned.map(proj => {
                    const stage = STAGES[proj.stage] || STAGES['Awarded']
                    return (
                      <div key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        title={proj.name}
                        style={{
                          padding: '2px 5px', borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                          background: stage.color, color: 'var(--color-white)',
                          fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          border: conflict ? '2px solid #DC2626' : 'none' }}>
                        {proj.customer_account?.split(' ')[0] || proj.name.split(' ')[0]}
                      </div>
                    )
                  })}

                  {/* Actual field log indicator */}
                  {actual.length > 0 && (
                    <div className="ops-board-3b7b" title="Field log recorded" />
                  )}

                  {assigned.length === 0 && !isSun && (
                    <div className="ops-board-ed66">
                      <div className="ops-board-2e0d" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Month Grid View ───────────────────────────────────────────────────────────
function MonthGridView({ projects, assignments, currentDate, onSelectProject }) {
  // On mobile the cells need minimum height to show content but still allow scroll
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // day of week for first
  const tod = today()

  // Build 6 weeks of cells
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = addDays(firstDay, i - startPad)
    cells.push(d)
  }

  // Jobs on a given day
  const jobsOnDay = (d) => {
    const ds = fmtDate(d)
    return projects.filter(p => {
      const s = p.scheduled_date || ''
      const e = p.target_completion || s
      return s <= ds && ds <= e
    })
  }

  return (
    <div>
      {/* Day headers */}
      <div className="ops-board-a061">
        {DAY_NAMES.map(d => (
          <div key={d} className="ops-board-f4a3">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="ops-board-29ea">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month
          const isToday = isSameDay(d, tod)
          const jobs = jobsOnDay(d)

          return (
            <div key={i} style={{
              background: isToday ? 'var(--state-info-soft)' : inMonth ? '#fff' : 'var(--surface-base)',
              minHeight: 72, padding: '4px 4px 2px' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 'var(--radius-round)', marginBottom: 3,
                background: isToday ? 'var(--navy)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : inMonth ? 'var(--black)' : 'var(--text-4)' }}>
                  {d.getDate()}
                </span>
              </div>

              {jobs.slice(0, 3).map(proj => {
                const stage = STAGES[proj.stage] || STAGES['Awarded']
                return (
                  <div key={proj.id}
                    onClick={() => onSelectProject(proj)}
                    style={{
                      padding: '2px 5px', borderRadius: 'var(--r-xs)', marginBottom: 'var(--space-3xs)',
                      background: stage.color, color: 'var(--color-white)',
                      fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-bold)', cursor: 'pointer',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.customer_account?.split(' ')[0] || proj.name.split(' ')[0]}
                  </div>
                )
              })}
              {jobs.length > 3 && (
                <div className="ops-board-83cf">+{jobs.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main OpsBoard ─────────────────────────────────────────────────────────────
export default function OpsBoard() {
  const [projects, setProjects]     = useState([])
  const [assignments, setAssignments] = useState([])
  const [fieldLogs, setFieldLogs]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('gantt')      // gantt | crew | month
  const [span, setSpan]             = useState('2week')      // week | 2week | month
  const [currentDate, setCurrentDate] = useState(today())
  const [selectedProject, setSelectedProject] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')
  const [search, setSearch]         = useState('')

  useEffect(() => {
    Promise.all([
      db.from('projects')
        .select('id, name, job_number, customer_account, city, state, stage, contract_value, scheduled_date, target_completion, notes, purchase_order_id')
        .neq('archived', true)
        .order('scheduled_date', { ascending: true, nullsFirst: false }),
      db.from('project_assignments')
        .select('*'),
      db.from('daily_field_logs')
        .select('project_id, report_date, crew_members')
        .gte('report_date', fmtDate(addDays(today(), -30))),
    ]).then(([{ data: p, error: pErr }, { data: a, error: aErr }, { data: fl }]) => {
      if (pErr) console.error('Projects query error:', pErr)
      if (aErr) console.error('Assignments query error:', aErr)
      setProjects((p || []).filter(proj => proj.stage !== 'Cancelled'))
      setAssignments(a || [])
      setFieldLogs(fl || [])
      setLoading(false)
    })
  }, [])

  const handleProjectSave = (updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setSelectedProject(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  // Days to display
  const dayCount = span === 'week' ? 7 : span === '2week' ? 14 : 28
  const days = getDaysInRange(currentDate, dayCount)

  // Navigation
  const go = (dir) => {
    const n = span === 'week' ? 7 : span === '2week' ? 14 : 28
    setCurrentDate(d => addDays(d, dir * n))
  }

  // Filter projects
  const filteredProjects = projects.filter(p => {
    if (stageFilter !== 'all' && p.stage !== stageFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.customer_account?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Conflict detection — any crew double-booked this week?
  const conflicts = []
  const crewDayMap = new Map()
  assignments.forEach(a => {
    if (!a.start_date || !a.end_date) return
    const s = parseDate(a.start_date), e = parseDate(a.end_date)
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
      const key = `${a.crew_name}:${fmtDate(d)}`
      if (crewDayMap.has(key)) conflicts.push({ crew: a.crew_name, date: fmtDate(d) })
      else crewDayMap.set(key, a.project_id)
    }
  })

  // Date range label
  const startLabel = `${MON_NAMES[days[0].getMonth()]} ${days[0].getDate()}`
  const endLabel   = `${MON_NAMES[days[days.length-1].getMonth()]} ${days[days.length-1].getDate()}, ${days[days.length-1].getFullYear()}`

  return (
    <div className="page-content fade-in ops-board-9035">

      {/* Header bar */}
      <div className="ops-board-657a">

        {/* Row 1 — View + Span + Date nav */}
        <div className="ops-board-528d">

          {/* View toggles */}
          <div className="card-section">
            {[
              { key: 'gantt', Icon: Rows, label: 'Gantt' },
              { key: 'crew',  Icon: Users, label: 'Crew'  },
              { key: 'month', Icon: CalendarBlank, label: 'Month' },
            ].map(({ key, Icon, label }) => (
              <button key={key} onClick={() => setView(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', padding: '4px 8px', borderRadius: 'var(--radius-s)', background: view === key ? 'var(--brand-primary)' : 'var(--surface-hover)', color: view === key ? '#fff' : 'var(--text-primary)', fontWeight: 'var(--fw-bold)', fontSize: 'var(--text-xs)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <Icon size="0.75rem" weight={view === key ? 'fill' : 'regular'} />
                {label}
              </button>
            ))}
          </div>

          {/* Span toggles — hidden on month view */}
          {view !== 'month' && (
            <div className="card-section">
              {[['week','1W'],['2week','2W'],['month','4W']].map(([key, lbl]) => (
                <button key={key} onClick={() => setSpan(key)}
                  style={{ padding: '4px 8px', borderRadius: 'var(--radius-s)', background: span === key ? 'var(--brand-primary)' : 'var(--surface-hover)', color: span === key ? '#fff' : 'var(--text-primary)', fontWeight: 'var(--fw-bold)', fontSize: 'var(--text-xs)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {lbl}
                </button>
              ))}
            </div>
          )}

          {/* Date navigation */}
          <div className="ops-board-612c">
            <button onClick={() => go(-1)} className="ops-board-f16f">
              <CaretLeft size="0.75rem" />
            </button>
            <button onClick={() => setCurrentDate(today())} className="ops-board-6902">
              Today
            </button>
            <span className="text-label">

              {view === 'month'
                ? `${MON_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `${startLabel} – ${endLabel}`}
            </span>
            <button onClick={() => go(1)} className="ops-board-f16f">
              <CaretRight size="0.75rem" />
            </button>
          </div>
        </div>

        {/* Row 2 — Search + Filter + Conflicts */}
        <div className="flex-gap-s">

          {/* Search */}
          <div className="ops-board-ea65">
            <MagnifyingGlass size="0.75rem" className="ops-board-56e5" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…"
              className="ops-board-ccc9" />
          </div>

          {/* Stage filter */}
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="ops-board-2c1e">
            <option value="all">All Stages</option>
            {STAGES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Conflict badge */}
          {conflicts.length > 0 && (
            <div className="ops-board-890e">
              <Warning size="0.75rem" weight="fill" />
              {conflicts.length}
            </div>
          )}
        </div>
      </div>

      {/* Board content */}
      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: view === 'month' ? 'var(--space-l)' : 0, paddingBottom: 'calc(var(--space-l) + env(safe-area-inset-bottom, 0px))' }}>
        {loading ? (
          <div className="ops-board-cd0d">
            <div className="spinner" />
            <span className="ops-board-bf37">Loading operations board…</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty">
            <CalendarBlank size="2.5rem" className="empty-icon" />
            <div className="empty-title">No jobs to display</div>
            <div className="empty-desc">Adjust your filters or schedule some projects.</div>
          </div>
        ) : view === 'gantt' ? (
          <GanttView projects={filteredProjects} assignments={assignments} days={days} onSelectProject={setSelectedProject} />
        ) : view === 'crew' ? (
          <CrewBoardView projects={filteredProjects} assignments={assignments} fieldLogs={fieldLogs} days={days} onSelectProject={setSelectedProject} />
        ) : (
          <MonthGridView projects={filteredProjects} assignments={assignments} currentDate={currentDate} onSelectProject={setSelectedProject} />
        )}
      </div>

      {/* Job detail panel */}
      {selectedProject && (
        <>
          <div className="ops-board-35a8"
            onClick={() => setSelectedProject(null)} />
          <JobPanel
            project={selectedProject}
            assignments={assignments}
            onClose={() => setSelectedProject(null)}
            onSave={handleProjectSave}
          />
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
