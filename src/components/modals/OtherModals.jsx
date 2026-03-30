import { useState } from 'react'

const today = () => new Date().toISOString().split('T')[0]

export function TaskModal({ task, onClose, onSave }) {
  const [f, setF] = useState(task || { title: '', related_to: '', assigned_to: 'Kodylee', due_date: today(), priority: 'HIGH', notes: '' })
  const s = (k, v) => setF(x => ({ ...x, [k]: v }))

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-head">
          <span className="modal-title">{task?.id ? 'Edit Task' : 'Add Task'}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Task *</label>
            <input className="form-input" value={f.title} onChange={e => s('title', e.target.value)} placeholder="e.g. Call Creative Contractors re: Clearwater City Hall" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-select" value={f.assigned_to} onChange={e => s('assigned_to', e.target.value)}>
                {['Kodylee','Shaun','Field Crew','Admin'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={f.due_date || ''} onChange={e => s('due_date', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={f.priority} onChange={e => s('priority', e.target.value)}>
                {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Related To</label>
              <input className="form-input" value={f.related_to || ''} onChange={e => s('related_to', e.target.value)} placeholder="Project or company" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={f.notes || ''} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(f)}>Save Task</button>
        </div>
      </div>
    </div>
  )
}

export function RelModal({ rel, onClose, onSave }) {
  const [f, setF] = useState(rel || {
    company_name: '', type: 'GC', tier: 'T1', city: 'Tampa', phone: '',
    key_contact: '', contact_role: 'Estimating', linkedin_done: false,
    meeting_done: false, preq_submitted: false, on_bid_list: false, spec_sent: false, notes: '',
  })
  const s = (k, v) => setF(x => ({ ...x, [k]: v }))
  const t = k => setF(x => ({ ...x, [k]: !x[k] }))

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-head">
          <span className="modal-title">{rel?.id ? 'Edit Company' : 'Add Company'}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input className="form-input" value={f.company_name} onChange={e => s('company_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={f.type} onChange={e => s('type', e.target.value)}>
                {['GC','MEP Engineer','Owner/Developer','Insurance','Other'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tier</label>
              <select className="form-select" value={f.tier} onChange={e => s('tier', e.target.value)}>
                {['T1','T2','T3'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={f.city || ''} onChange={e => s('city', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={f.phone || ''} onChange={e => s('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Key Contact</label>
              <input className="form-input" value={f.key_contact || ''} onChange={e => s('key_contact', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Progress Checklist</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
              {[
                ['linkedin_done', 'LinkedIn Connected'],
                ['meeting_done', 'Meeting Held'],
                ['preq_submitted', 'Preq Submitted'],
                ['on_bid_list', 'On Bid List'],
                ['spec_sent', 'Spec Sent'],
              ].map(([k, label]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--black)', fontWeight: 500 }}>
                  <input type="checkbox" checked={f[k] || false} onChange={() => t(k)} style={{ accentColor: 'var(--success)', width: 15, height: 15 }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={f.notes || ''} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(f)}>Save</button>
        </div>
      </div>
    </div>
  )
}
