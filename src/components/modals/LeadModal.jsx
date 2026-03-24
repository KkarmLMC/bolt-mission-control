import { useState } from 'react'

const DEFAULTS = {
  project_name: '', address: '', county: 'Pinellas', permit_number: '',
  permit_type: 'Commercial New Construction', value_str: '', value_int: 0,
  status: 'NEW LEAD', priority: '🟠 HIGH', contractor: '', contact_name: '',
  contact_phone: '', next_action: 'Call GC — confirm LP scope', notes: '', assigned_to: 'Kodylee',
}

export default function LeadModal({ lead, onClose, onSave }) {
  const [f, setF] = useState(lead || DEFAULTS)
  const s = (k, v) => setF(x => ({ ...x, [k]: v }))

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-head">
          <span className="modal-title">{lead?.id ? 'Edit Lead' : 'Add New Lead'}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={f.project_name} onChange={e => s('project_name', e.target.value)} placeholder="e.g. Clearwater City Hall Redevelopment" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">County</label>
              <select className="form-select" value={f.county} onChange={e => s('county', e.target.value)}>
                {['Pinellas','Hillsborough','Pasco','Polk','Manatee','Sarasota','Clearwater (City)'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Permit Number</label>
              <input className="form-input" value={f.permit_number || ''} onChange={e => s('permit_number', e.target.value)} placeholder="BLD-2026-00123" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={f.address || ''} onChange={e => s('address', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Project Value</label>
              <input className="form-input" value={f.value_str || ''} onChange={e => s('value_str', e.target.value)} placeholder="$31,600,000" />
            </div>
            <div className="form-group">
              <label className="form-label">Permit Type</label>
              <input className="form-input" value={f.permit_type || ''} onChange={e => s('permit_type', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={f.priority} onChange={e => s('priority', e.target.value)}>
                {['🔴 CRITICAL','🟠 HIGH','🟡 MEDIUM','🟢 PIPELINE'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={f.status} onChange={e => s('status', e.target.value)}>
                {['NEW LEAD','CONTACTED','MEETING SET','PROPOSAL SENT','ON BID LIST','BID SUBMITTED','WON ✓','LOST ✗','ON HOLD'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contractor / GC</label>
              <input className="form-input" value={f.contractor || ''} onChange={e => s('contractor', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input className="form-input" value={f.contact_name || ''} onChange={e => s('contact_name', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input className="form-input" value={f.contact_phone || ''} onChange={e => s('contact_phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-select" value={f.assigned_to || 'Kodylee'} onChange={e => s('assigned_to', e.target.value)}>
                {['Kodylee','Shaun','Field Crew','Admin'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Next Action</label>
            <input className="form-input" value={f.next_action || ''} onChange={e => s('next_action', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={f.notes || ''} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave({ ...f, value_int: parseInt((f.value_str || '').replace(/[^0-9]/g, '')) || 0 })}>
            Save Lead
          </button>
        </div>
      </div>
    </div>
  )
}
