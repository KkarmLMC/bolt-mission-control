import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash, MagnifyingGlass, X, CaretDown, CaretRight,
  DotsSixVertical, Buildings, Package, Wrench, Check,
  ArrowRight, Warning } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.jsx'
import { logActivity } from '../lib/logActivity.js'
import { Button, Card, StatCard } from '../components/ui'
import ProjectPicker from '../components/ProjectPicker.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="text-xs font-bold text-text-primary block mb-1">
      {children}{required && <span className="text-red ml-0.5">*</span>}
    </label>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="mt-4 pt-3">
      <div className="text-xs font-bold text-text-primary">{label}</div>
    </div>
  )
}

// ─── Part search dropdown ─────────────────────────────────────────────────────
function PartSearch({ onSelect, warehouseId }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      const q = query.toLowerCase()
      let req = db.from('parts').select('id, sku, name, unit_cost').eq('is_active', true)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(10)
      const { data } = await req
      // If warehouse selected, enrich with current stock
      if (warehouseId && data?.length) {
        const ids = data.map(p => p.id)
        const { data: levels } = await db.from('inventory_levels')
          .select('part_id, quantity_on_hand')
          .eq('warehouse_id', warehouseId)
          .in('part_id', ids)
        const stockMap = {}
        levels?.forEach(l => { stockMap[l.part_id] = l.quantity_on_hand })
        setResults(data.map(p => ({ ...p, stock: stockMap[p.id] ?? null })))
      } else {
        setResults(data?.map(p => ({ ...p, stock: null })) || [])
      }
      setLoading(false)
      setOpen(true)
    }, 250)
    return () => clearTimeout(t)
  }, [query, warehouseId])

  const handleSelect = (part) => {
    onSelect(part)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <MagnifyingGlass size="0.875rem" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search parts by name or SKU…"
          className="w-full pl-7 pr-7"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-none cursor-pointer text-text-muted p-0">
            <X size="0.8125rem" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-surface-base rounded-lg mt-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-text-muted text-sm">Searching…</div>
          ) : results.map(part => (
            <button key={part.id} onMouseDown={() => handleSelect(part)}
              className="w-full flex items-center justify-between p-2 px-3 bg-none cursor-pointer text-left border-b border-border-l">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{part.name}</div>
                <div className="text-xs font-mono text-text-muted">{part.sku}</div>
              </div>
              <div className="flex-shrink-0 text-right ml-3">
                <div className="text-xs font-bold text-text-primary">
                  ${part.unit_cost?.toFixed(2) || '—'}
                </div>
                {part.stock !== null && (
                  <div className={`text-xs font-semibold ${part.stock > 0 ? 'text-success-text' : 'text-error-dark'}`}>
                    {part.stock} in stock
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single line item row ─────────────────────────────────────────────────────
function LineItemRow({ item, warehouses, onUpdate, onRemove }) {
  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)

  return (
    <div className="grid grid-cols-[1fr_70px_90px_80px_36px] gap-2 items-center py-2 border-b border-border-l">
      <div className="min-w-0">
        {item.sku && <div className="text-xs font-mono text-text-muted mb-0.5">{item.sku}</div>}
        <div className="text-sm font-semibold truncate">{item.description}</div>
        {warehouses.length > 1 && (
          <select
            value={item.warehouse_id || ''}
            onChange={e => onUpdate({ ...item, warehouse_id: e.target.value })}
            className="text-xs mt-1 p-0.5 rounded border-border-subtle bg-surface-base text-text-muted w-full">
            <option value="">No warehouse</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.replace(' Warehouse','')}</option>)}
          </select>
        )}
      </div>
      <input
        type="number" min="0" step="1"
        value={item.quantity}
        onChange={e => onUpdate({ ...item, quantity: e.target.value })}
        className="w-full text-right text-xs"
      />
      <input
        type="number" min="0" step="0.01"
        value={item.unit_cost}
        onChange={e => onUpdate({ ...item, unit_cost: e.target.value })}
        className="w-full text-right text-xs"
      />
      <div className={`text-right text-xs font-bold ${lineTotal > 0 ? 'text-text-primary' : 'text-text-muted'}`}>
        ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <button onClick={onRemove}
        className="w-8 h-8 flex items-center justify-center bg-surface-hover rounded-md cursor-pointer text-error-dark">
        <Trash size="0.8125rem" />
      </button>
    </div>
  )
}

// ─── Scope section block ──────────────────────────────────────────────────────
function ScopeSection({ section, warehouses, defaultWarehouseId, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true)
  const subtotal = section.items.reduce((s, i) => s + ((parseFloat(i.quantity)||0) * (parseFloat(i.unit_cost)||0)), 0)

  const addPart = (part) => {
    const newItem = {
      _key: Date.now(),
      line_type: 'material',
      part_id: part.id,
      sku: part.sku,
      description: part.name,
      quantity: 1,
      unit_cost: part.unit_cost || 0,
      warehouse_id: defaultWarehouseId || '' }
    onUpdate({ ...section, items: [...section.items, newItem] })
  }

  const addManual = () => {
    onUpdate({ ...section, items: [...section.items, {
      _key: Date.now(), line_type: 'material', part_id: null,
      sku: '', description: '', quantity: 1, unit_cost: 0,
      warehouse_id: defaultWarehouseId || '',
    }]})
  }

  const updateItem = (key, updated) => {
    onUpdate({ ...section, items: section.items.map(i => i._key === key ? updated : i) })
  }

  const removeItem = (key) => {
    onUpdate({ ...section, items: section.items.filter(i => i._key !== key) })
  }

  return (
    <Card className="mb-4">
      {/* Section header */}
      <div className="bg-brand-primary p-3 pl-5 flex items-center gap-2">
        <button onClick={() => setExpanded(e => !e)}
          className="bg-none cursor-pointer p-0 text-surface-base/50 flex">
          <CaretDown size="0.875rem" style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
        </button>
        <input
          value={section.title}
          onChange={e => onUpdate({ ...section, title: e.target.value })}
          placeholder="Section name (e.g. Green House Ground Ring)"
          className="flex-1 bg-transparent outline-none text-surface-base font-bold text-sm"
        />
        {subtotal > 0 && (
          <span className="text-xs font-bold text-surface-base/60 whitespace-nowrap">
            ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
        <button onClick={onRemove}
          className="bg-none cursor-pointer p-0 text-red/50 flex">
          <Trash size="0.8125rem" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 pl-5">
          {/* Column headers */}
          {section.items.length > 0 && (
            <div className="grid grid-cols-[1fr_70px_90px_80px_36px] gap-2 mb-2">
              {['Item / SKU', 'Qty', 'Unit Cost', 'Amount', ''].map((h, i) => (
                <div key={i} className={`text-xs font-bold text-text-primary ${i > 0 && i < 4 ? 'text-right' : 'text-left'}`}>{h}</div>
              ))}
            </div>
          )}

          {/* Items */}
          {section.items.map(item => (
            <LineItemRow
              key={item._key}
              item={item}
              warehouses={warehouses}
              onUpdate={(updated) => updateItem(item._key, updated)}
              onRemove={() => removeItem(item._key)}
            />
          ))}

          {section.items.length === 0 && (
            <div className="text-center p-5 text-text-muted text-sm">
              No items yet. Search for a part or add manually.
            </div>
          )}

          {/* Part search */}
          <div className="mt-3">
            <PartSearch onSelect={addPart} warehouseId={defaultWarehouseId} />
          </div>
          <button onClick={addManual}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-text-muted bg-none cursor-pointer p-0">
            <Plus size="0.75rem" /> Add custom line item
          </button>
        </div>
      )}
    </Card>
  )
}

// ─── Labor section ────────────────────────────────────────────────────────────
function LaborSection({ items, onUpdate }) {
  const [expanded, setExpanded] = useState(true)
  const total = items.reduce((s, i) => s + ((parseFloat(i.quantity)||0) * (parseFloat(i.unit_cost)||0)), 0)

  const addLine = () => onUpdate([...items, { _key: Date.now(), description: 'Installation', quantity: 1, unit_cost: 0 }])
  const updateItem = (key, updated) => onUpdate(items.map(i => i._key === key ? updated : i))
  const removeItem = (key) => onUpdate(items.filter(i => i._key !== key))

  return (
    <Card className="mb-4">
      <div className="bg-brand-primary p-3 pl-5 flex items-center gap-2">
        <button onClick={() => setExpanded(e => !e)}
          className="bg-none cursor-pointer p-0 text-surface-base/50 flex">
          <CaretDown size="0.875rem" style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Wrench size="0.875rem" className="text-surface-base/70" />
          <span className="font-bold text-sm text-surface-base">Installation / Labor</span>
        </div>
        {total > 0 && (
          <span className="text-xs font-bold text-white/60">
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      {expanded && (
        <div className="p-3 pl-5">
          {items.map(item => (
            <div key={item._key} className="grid grid-cols-[1fr_70px_100px_80px_36px] gap-2 items-center mb-2">
              <input value={item.description} onChange={e => updateItem(item._key, { ...item, description: e.target.value })}
                placeholder="Description (e.g. Bolt Install Crew)" className="w-full text-xs" />
              <input type="number" min="0" value={item.quantity} onChange={e => updateItem(item._key, { ...item, quantity: e.target.value })}
                className="w-full text-right text-xs" />
              <input type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(item._key, { ...item, unit_cost: e.target.value })}
                placeholder="0.00" className="w-full text-right text-xs" />
              <div className="text-right text-xs font-bold">
                ${((parseFloat(item.quantity)||0)*(parseFloat(item.unit_cost)||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
              </div>
              <button onClick={() => removeItem(item._key)}
                className="w-8 h-8 flex items-center justify-center bg-surface-hover rounded-md cursor-pointer text-error-dark">
                <Trash size="0.8125rem" />
              </button>
            </div>
          ))}
          <button onClick={addLine}
            className="flex items-center gap-1 text-xs font-semibold text-text-3 bg-none cursor-pointer p-0 mt-2">
            <Plus size="0.75rem" /> Add labor line
          </button>
        </div>
      )}
    </Card>
  )
}

// ─── Totals bar ───────────────────────────────────────────────────────────────
function TotalsBar({ sections, laborItems }) {
  const materialsTotal = sections.reduce((s, sec) =>
    s + sec.items.reduce((ss, i) => ss + ((parseFloat(i.quantity)||0)*(parseFloat(i.unit_cost)||0)), 0), 0)
  const laborTotal = laborItems.reduce((s, i) => s + ((parseFloat(i.quantity)||0)*(parseFloat(i.unit_cost)||0)), 0)
  const grandTotal = materialsTotal + laborTotal

  if (grandTotal === 0) return null

  return (
    <StatCard className="mb-6 bg-brand-primary text-surface-base">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-surface-base/60">Materials</span>
        <span className="text-sm font-semibold">${materialsTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      </div>
      {laborTotal > 0 && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-surface-base/60">Installation</span>
          <span className="text-sm font-semibold">${laborTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
      )}
      <div className="flex justify-between pt-2 mt-1">
        <span className="text-lg font-black">Total</span>
        <span className="text-lg font-black">${grandTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      </div>
    </StatCard>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PONew() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Header fields
  const [division, setDivision]       = useState('LM')
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [customerState, setCustomerState] = useState('')
  const [customerZip, setCustomerZip] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectName, setProjectName]   = useState('')
  const [projectRef, setProjectRef]     = useState('')
  const [quoteNumber, setQuoteNumber]   = useState('')
  const [poDate, setPoDate]             = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]               = useState('')
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('')

  // Auto-populate from selected project
  const handleProjectSelect = (proj) => {
    setSelectedProject(proj)
    if (proj) {
      setProjectName(proj.name)
      setProjectRef(proj.job_number || '')
    } else {
      setProjectName('')
      setProjectRef('')
    }
  }

  // Line items
  const [sections, setSections]   = useState([{ _key: Date.now(), title: '', items: [] }])
  const [laborItems, setLaborItems] = useState([])

  // Meta
  const [warehouses, setWarehouses] = useState([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    db.from('warehouses').select('id, name').eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        setWarehouses(data || [])
        if (data?.length) setDefaultWarehouseId(data[0].id)
      })
    // Generate next SO number
    db.from('sales_orders').select('so_number').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]?.so_number) {
          const match = data[0].so_number.match(/(\d+)$/)
          if (match) {
            const next = parseInt(match[1]) + 1
            setQuoteNumber(`W-${new Date().getFullYear()}-${String(next).padStart(4,'0')}`)
          }
        } else {
          setQuoteNumber(`W-${new Date().getFullYear()}-0001`)
        }
      })
  }, [])

  const addSection = () => {
    setSections(s => [...s, { _key: Date.now(), title: '', items: [] }])
  }

  const updateSection = (key, updated) => {
    setSections(s => s.map(sec => sec._key === key ? updated : sec))
  }

  const removeSection = (key) => {
    setSections(s => s.filter(sec => sec._key !== key))
  }

  const handleSave = async (submitAfter = false) => {
    if (!customerName.trim()) { setError('Customer name is required.'); return }
    setError('')
    setSaving(true)

    const materialsTotal = sections.reduce((s, sec) =>
      s + sec.items.reduce((ss, i) => ss + ((parseFloat(i.quantity)||0)*(parseFloat(i.unit_cost)||0)), 0), 0)
    const installationTotal = laborItems.reduce((s, i) => s + ((parseFloat(i.quantity)||0)*(parseFloat(i.unit_cost)||0)), 0)

    // Generate SO number
    const year = new Date().getFullYear()
    const { count } = await db.from('sales_orders').select('*', { count: 'exact', head: true })
    const poNumber = `SO-${year}-${String((count || 0) + 1).padStart(4, '0')}`

    // Create SO
    const { data: newPO, error: poErr } = await db.from('sales_orders').insert({
      so_number: poNumber,
      quote_number: quoteNumber || null,
      division,
      status: 'queued',
      customer_name: customerName.trim(),
      customer_address: customerAddress || null,
      customer_city: customerCity || null,
      customer_state: customerState || null,
      customer_zip: customerZip || null,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      project_name: projectName || null,
      project_ref: projectRef || null,
      so_date: poDate || null,
      notes: notes || null,
      materials_total: materialsTotal,
      installation_total: installationTotal,
      grand_total: materialsTotal + installationTotal,
      queued_at: new Date().toISOString() }).select().single()

    if (poErr || !newPO) { setError('Failed to save Sales Order. Please try again.'); setSaving(false); return }

    // Insert line items
    let sortOrder = 0
    for (const sec of sections) {
      for (const item of sec.items) {
        await db.from('so_line_items').insert({
          so_id: newPO.id,
          line_type: 'material',
          section_label: sec.title || null,
          part_id: item.part_id || null,
          warehouse_id: item.warehouse_id || defaultWarehouseId || null,
          sku: item.sku || null,
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unit_cost: parseFloat(item.unit_cost) || 0,
          sort_order: sortOrder++ })
      }
    }

    // Insert labor lines
    for (const item of laborItems) {
      await db.from('so_line_items').insert({
        so_id: newPO.id,
        line_type: 'labor',
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unit_cost: parseFloat(item.unit_cost) || 0,
        sort_order: sortOrder++ })
    }

    await logActivity(db, user?.id, 'warehouse_iq', {
      category:    'sales_order',
      action:      'created',
      label:       `Created Sales Order ${poNumber}`,
      entity_type: 'sales_order',
      entity_id:   newPO.id,
      meta:        { so_number: poNumber, customer: customerName, total: materialsTotal + installationTotal } })
    setSaving(false)
    navigate(`/sales-orders/${newPO.id}`)
  }

  return (
    <div className="page-content fade-in">

      {/* Division selector */}
      <div className="grid grid-cols-2 gap-3 mb-12">
        {[['LM', 'Lightning Master'], ['Bolt', 'Bolt Lightning']].map(([val, lbl]) => (
          <button key={val} onClick={() => setDivision(val)}
            className={`p-3 rounded-md cursor-pointer border-2 font-bold text-sm transition-all ${
              division === val
                ? 'border-brand-primary bg-brand-primary text-surface-base'
                : 'border-border-subtle bg-surface-base text-text-primary'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Customer info */}
      <Card className="p-5 mb-4">
        <div className="text-sm font-bold mb-3">Customer</div>

        <div className="mb-3">
          <Label required>Customer Name</Label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. GNS Electric Inc" className="w-full" />
        </div>

        <div className="mb-3">
          <Label>Street Address</Label>
          <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="123 Main St" className="w-full" />
        </div>

        <div className="grid grid-cols-[1fr_64px_88px] gap-2 mb-3">
          <div><Label>City</Label><input value={customerCity} onChange={e => setCustomerCity(e.target.value)} placeholder="Dallas" className="w-full" /></div>
          <div><Label>State</Label><input value={customerState} onChange={e => setCustomerState(e.target.value)} placeholder="TX" className="w-full" /></div>
          <div><Label>ZIP</Label><input value={customerZip} onChange={e => setCustomerZip(e.target.value)} placeholder="75001" className="w-full" /></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Phone</Label><input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(555) 000-0000" className="w-full" /></div>
          <div><Label>Email</Label><input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="name@company.com" className="w-full" /></div>
        </div>
      </Card>

      {/* Project info */}
      <Card className="p-5 mb-4">
        <div className="text-sm font-bold mb-3">Project Details</div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <Label>Quote Number</Label>
            <input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="W9-10-16699" className="w-full" />
          </div>
          <div>
            <Label>Date</Label>
            <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="mb-3">
          <ProjectPicker
            value={selectedProject}
            onChange={handleProjectSelect}
            label="Project / Job"
            required
          />
        </div>

        {selectedProject && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Project Name</Label>
              <input value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full" />
            </div>
            <div>
              <Label>Job #</Label>
              <input value={projectRef} onChange={e => setProjectRef(e.target.value)} className="w-full" />
            </div>
          </div>
        )}

        <div>
          <Label>Default Warehouse</Label>
          <select value={defaultWarehouseId} onChange={e => setDefaultWarehouseId(e.target.value)} className="w-full">
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="text-xs text-text-muted mt-1">New line items will default to this warehouse. You can change per line.</div>
        </div>
      </Card>

      {/* Scope sections */}
      <div className="text-sm font-bold mb-3">Line Items</div>

      {sections.map(sec => (
        <ScopeSection
          key={sec._key}
          section={sec}
          warehouses={warehouses}
          defaultWarehouseId={defaultWarehouseId}
          onUpdate={(updated) => updateSection(sec._key, updated)}
          onRemove={() => removeSection(sec._key)}
        />
      ))}

      <button onClick={addSection}
        className="flex items-center justify-center gap-2 w-full p-3 rounded-md border-2 border-dashed border-border-subtle bg-transparent text-text-muted font-bold text-sm cursor-pointer mb-4">
        <Plus size="0.9375rem" /> Add Scope Section
      </button>

      {/* Labor */}
      <LaborSection items={laborItems} onUpdate={setLaborItems} />

      {/* Notes */}
      <Card className="p-5 mb-4">
        <Label>Notes</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes for this Sales Order…" rows={3} className="w-full resize-vertical" />
      </Card>

      {/* Running total */}
      <TotalsBar sections={sections} laborItems={laborItems} />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-soft rounded-lg mb-4 text-error-dark text-sm">
          <Warning size="0.9375rem" />
          {error}
        </div>
      )}

      {/* Save actions */}
      <div className="grid grid-cols-2 gap-3 mb-20">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Save as Draft'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center justify-center gap-2">
          {saving ? 'Saving…' : <><ArrowRight size="0.9375rem" /> Save & Submit</>}
        </Button>
      </div>
    </div>
  )
}
