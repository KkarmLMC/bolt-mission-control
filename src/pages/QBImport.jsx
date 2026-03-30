import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadSimple, FileCsv, CheckCircle, Warning,
  ArrowLeft, MagnifyingGlass, Trash, ArrowRight,
  Table, X, FileXls } from '@phosphor-icons/react'
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx'
import { db } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.jsx'
import { logActivity } from '../lib/logActivity.js'

// ─── QB column name aliases ────────────────────────────────────────────────────
// QB Desktop exports column names inconsistently across versions — map them all
const COL = {
  invoiceNum:   ['Num', 'Invoice No', 'Invoice Number', 'Transaction No', 'DocNumber', 'Ref No', 'SO No', 'Sales Order No'],
  date:         ['Date', 'Invoice Date', 'TxnDate', 'Transaction Date', 'Order Date'],
  customer:     ['Name', 'Customer', 'Customer:Job', 'Customer Name', 'Bill To'],
  dueDate:      ['Due Date', 'DueDate', 'Ship Date', 'Expected Date'],
  amount:       ['Balance', 'Amount', 'Total', 'Grand Total', 'TotalAmt', 'Original Amount', 'Open Balance'],
  itemDesc:     ['Item', 'Description', 'Item Description', 'Product/Service', 'Service Description'],
  itemQty:      ['Qty', 'Quantity', 'Qty/hr Rate'],
  itemRate:     ['Sales Price', 'Rate', 'Unit Price', 'UnitPrice', 'Price Each'],
  itemAmount:   ['Amount', 'Item Amount', 'Line Amount', 'Ext. Price'],
  jobName:      ['Memo', 'Job Name', 'Ship To', 'Project Name', 'Customer Memo', 'P.O. No.', 'P.O. #', 'PO Number'],
  address:      ['Bill To', 'Address', 'Billing Address'] }

function findCol(headers, aliases) {
  const h = headers.map(x => x.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = h.findIndex(x => x === alias.toLowerCase() || x.includes(alias.toLowerCase()))
    if (idx !== -1) return idx
  }
  return -1
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return { headers: [], rows: [] }

  // Handle quoted fields
  const parseLine = line => {
    const result = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(l => {
    const vals = parseLine(l)
    const row = {}
    headers.forEach((h, i) => { row[h.trim()] = vals[i] || '' })
    return row
  })

  return { headers, rows }
}

function parseXLSX(buffer) {
  try {
    const wb = xlsxRead(buffer, { type: 'array', cellDates: true })
    if (!wb.SheetNames.length) return { headers: [], rows: [], error: 'No sheets found in workbook' }
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' })
    if (!raw.length) return { headers: [], rows: [], error: 'Sheet is empty' }

    // QB Desktop Excel exports have spacer columns (blanks between real columns).
    // Find the row that contains real headers (Type, Num, Date, Name, etc.)
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(raw.length, 5); i++) {
      const rowStr = raw[i].map(c => String(c || '')).join(' ').toLowerCase()
      if (rowStr.includes('type') || rowStr.includes('num') || rowStr.includes('date')) {
        headerRowIdx = i; break
      }
    }

    const rawHeaders = raw[headerRowIdx].map(c => String(c || '').trim())
    // Filter out blank spacer columns — keep only columns that have a header
    const realCols = rawHeaders.map((h, i) => ({ h, i })).filter(x => x.h.length > 0)
    if (!realCols.length) return { headers: [], rows: [], error: 'No column headers found in first 5 rows' }
    const headers = realCols.map(x => x.h)

    const rows = raw.slice(headerRowIdx + 1).map(rawRow => {
      const row = {}
      realCols.forEach(({ h, i }) => {
        let val = (i < rawRow.length) ? rawRow[i] ?? '' : ''
        // Convert Date objects to string
        if (val instanceof Date) val = val.toISOString().split('T')[0]
        row[h] = String(val)
      })
      return row
    })

    return { headers, rows }
  } catch (err) {
    console.error('parseXLSX error:', err)
    return { headers: [], rows: [], error: err.message }
  }
}

function detectFormat(headers) {
  const h = headers.join(' ').toLowerCase()
  if (h.includes('item') || h.includes('qty') || h.includes('rate')) return 'detail'
  return 'summary'
}

function parseAmount(str) {
  if (!str) return 0
  const n = parseFloat(str.replace(/[$,\s]/g, '').replace(/[()]/g, match => match === '(' ? '-' : ''))
  return isNaN(n) ? 0 : n
}

function groupByInvoice(rows, headers) {
  const invoiceIdx = findCol(headers, COL.invoiceNum)
  const dateIdx    = findCol(headers, COL.date)
  const custIdx    = findCol(headers, COL.customer)
  const amtIdx     = findCol(headers, COL.amount)
  const jobIdx     = findCol(headers, COL.jobName)
  const descIdx    = findCol(headers, COL.itemDesc)
  const qtyIdx     = findCol(headers, COL.itemQty)
  const rateIdx    = findCol(headers, COL.itemRate)
  const lineAmtIdx = findCol(headers, COL.itemAmount)
  const dueDateIdx = findCol(headers, COL.dueDate)

  const map = new Map()

  rows.forEach(row => {
    const vals = Object.values(row)
    const get  = idx => (idx >= 0 ? vals[idx] : '') || ''

    const invoiceNum = get(invoiceIdx)
    if (!invoiceNum) return // skip blank rows
    // Skip rows that aren't Invoices or Sales Orders (QB exports include subtotal/total rows)
    const rowType = (Object.values(row)[0] || '').trim()
    const VALID_TYPES = ['Invoice', 'Sales Order', 'SalesOrder']
    if (rowType && !VALID_TYPES.includes(rowType)) return

    // QB Desktop uses "Customer:Job" notation — split it
    const rawName = get(custIdx)
    const colonIdx = rawName.indexOf(':')
    const customerName = colonIdx > -1 ? rawName.slice(0, colonIdx) : rawName
    const jobFromName  = colonIdx > -1 ? rawName.slice(colonIdx + 1) : ''

    if (!map.has(invoiceNum)) {
      map.set(invoiceNum, {
        invoiceNum,
        date:       get(dateIdx),
        dueDate:    get(dueDateIdx),
        customer:   customerName,
        jobName:    get(jobIdx) || jobFromName,
        total:      parseAmount(get(amtIdx)),
        lineItems:  [],
        raw:        row })
    }

    const entry = map.get(invoiceNum)

    // Update total from header row (highest amount)
    const rowAmt = parseAmount(get(amtIdx))
    if (rowAmt > entry.total) entry.total = rowAmt

    // Add line item if description present
    const desc = get(descIdx)
    if (desc && desc.length > 0) {
      const qty  = parseFloat(get(qtyIdx)) || 1
      const rate = parseAmount(get(rateIdx))
      const lAmt = parseAmount(get(lineAmtIdx)) || (qty * rate)
      entry.lineItems.push({ description: desc, quantity: qty, unit_cost: rate, amount: lAmt })
    }
  })

  return Array.from(map.values())
}

// ─── Preview row ───────────────────────────────────────────────────────────────
function InvoiceRow({ inv, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr style={{ background: selected ? 'var(--blue-soft)' : 'transparent', cursor: 'pointer' }}
        onClick={() => onToggle(inv.invoiceNum)}>
        <td style={{ padding: '10px 12px' }}>
          <input type="checkbox" checked={selected} onChange={() => onToggle(inv.invoiceNum)}
            onClick={e => e.stopPropagation()} />
        </td>
        <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 'var(--text-sm)' }}>{inv.invoiceNum}</td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{inv.customer}</div>
          {inv.jobName && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 2 }}>{inv.jobName}</div>}
        </td>
        <td style={{ padding: '10px 12px', fontSize: 'var(--text-sm)' }}>{inv.date}</td>
        <td style={{ padding: '10px 12px', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--mono)' }}>
          ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
        <td style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>{inv.lineItems.length} lines</span>
        </td>
        <td style={{ padding: '10px 12px' }}>
          {inv.lineItems.length > 0 && (
            <button onClick={e => { e.stopPropagation(); setExpanded(x => !x) }}
              style={{ background: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>
              {expanded ? '▲ Hide' : '▼ Show'}
            </button>
          )}
        </td>
      </tr>
      {expanded && inv.lineItems.map((li, i) => (
        <tr key={i} style={{ background: 'var(--white)' }}>
          <td />
          <td />
          <td colSpan={2} style={{ padding: '6px 12px 6px 24px', fontSize: 'var(--text-sm)', color: 'var(--black)' }}>
            {li.description}
          </td>
          <td style={{ padding: '6px 12px', fontSize: 'var(--text-sm)', fontFamily: 'var(--mono)' }}>
            {li.quantity > 1 ? `${li.quantity} × $${li.unit_cost}` : `$${li.amount.toLocaleString()}`}
          </td>
          <td colSpan={2} />
        </tr>
      ))}
    </>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function QBImport() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const fileRef = useRef()
  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState([]) // grouped invoices
  const [format, setFormat] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [division, setDivision] = useState('LM')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const handleFile = useCallback(file => {
    const ext = file?.name?.toLowerCase().split('.').pop()
    if (!file || !['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Please upload a CSV or Excel (.xlsx) file exported from QuickBooks Desktop.')
      return
    }
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        let headers, rows, parseError
        if (ext === 'csv') {
          const text = e.target.result
          ;({ headers, rows } = parseCSV(text))
        } else {
          const buffer = new Uint8Array(e.target.result)
          ;({ headers, rows, error: parseError } = parseXLSX(buffer))
        }
        if (!headers || !headers.length) {
          setError(parseError || 'Could not parse file. Make sure it is a valid QuickBooks export.')
          return
        }
        const fmt = detectFormat(headers)
        const invoices = groupByInvoice(rows, headers)
        if (!invoices.length) { setError('No records found. Make sure you exported an Invoice, Sales Order, or Transaction report from QuickBooks.'); return }
        setFormat(fmt)
        setParsed(invoices)
        setSelected(new Set(invoices.map(i => i.invoiceNum)))
        setStep('preview')
      } catch (err) {
        console.error('QB Import parse error:', err)
        setError(`Parse error: ${err.message}`)
      }
    }
    if (ext === 'csv') reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  }, [])

  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.invoiceNum)))
  }

  const toggleOne = num => {
    const s = new Set(selected)
    s.has(num) ? s.delete(num) : s.add(num)
    setSelected(s)
  }

  const filtered = parsed.filter(i =>
    !search || i.customer.toLowerCase().includes(search.toLowerCase()) ||
    i.invoiceNum.toLowerCase().includes(search.toLowerCase()) ||
    (i.jobName || '').toLowerCase().includes(search.toLowerCase())
  )

  const runImport = async () => {
    setImporting(true)
    const toImport = parsed.filter(i => selected.has(i.invoiceNum))
    const res = []

    for (const inv of toImport) {
      try {
        // Check if SO already exists
        const { data: existing } = await db.from('sales_orders')
          .select('id, so_number')
          .eq('quickbooks_doc_number', inv.invoiceNum)
          .maybeSingle()

        if (existing) { res.push({ invoiceNum: inv.invoiceNum, action: 'skipped', reason: 'Already imported' }); continue }

        // Create SO
        const soNum = `QB-${inv.invoiceNum}`
        const { data: so, error: soErr } = await db.from('sales_orders').insert({
          so_number:             soNum,
          customer_name:         inv.customer,
          project_name:          inv.jobName || inv.customer,
          division,
          status:                'queued',
          so_date:               inv.date || null,
          grand_total:           inv.total,
          materials_total:       inv.total,
          quickbooks_doc_number: inv.invoiceNum,
          quickbooks_sync_at:    new Date().toISOString(),
          created_by:            profile?.full_name || profile?.email }).select('id').single()

        if (soErr) throw soErr

        // Line items
        if (inv.lineItems.length) {
          await db.from('so_line_items').insert(
            inv.lineItems.map((li, idx) => ({
              so_id: so.id, line_type: 'material',
              description: li.description, quantity: li.quantity,
              unit_cost: li.unit_cost, sort_order: idx }))
          )
        }

        // Create project
        const { data: project } = await db.from('projects').insert({
          name:              inv.jobName || inv.customer,
          customer_account:  inv.customer,
          stage:             'Awarded',
          contract_value:    inv.total,
          purchase_order_id: so.id,
          quickbooks_sync_at: new Date().toISOString() }).select('id').single()

        // Link SO back to project
        if (project) {
          await db.from('sales_orders').update({ project_id: project.id }).eq('id', so.id)
        }

        res.push({ invoiceNum: inv.invoiceNum, customer: inv.customer, action: 'created', soNum })
      } catch (e) {
        res.push({ invoiceNum: inv.invoiceNum, action: 'error', reason: e.message })
      }
    }

    setResults(res)
    setImporting(false)
    const createdCount = res.filter(r => r.action === 'created').length
    await logActivity(db, profile?.id, 'mission_control', {
      category:    'import',
      action:      'qb_import',
      label:       `QB Import — ${createdCount} SO${createdCount !== 1 ? 's' : ''} created`,
      meta:        { created: createdCount, skipped: res.filter(r => r.action === 'skipped').length, total: res.length } })
    setStep('done')
  }

  // ── Upload screen ──
  if (step === 'upload') return (
    <div className="page-content fade-in">
      <div style={{ marginBottom: 'var(--mar-xl)' }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: 'var(--text-3)', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 0, marginBottom: 'var(--mar-m)' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>QUICKBOOKS</div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 800 }}>Import Sales Orders</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: 4 }}>
          Import invoices or sales orders exported from QuickBooks Desktop
        </div>
      </div>

      {/* How to export instructions */}
      <div className="card" style={{ marginBottom: 'var(--mar-l)' }}>
        <div className="card-header"><span className="card-title">How to export from QuickBooks Desktop</span></div>
        <div style={{ padding: 'var(--pad-l)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-m)' }}>
          {[
            ['1', 'Open QuickBooks Desktop and go to Reports → Sales'],
            ['2', 'Choose either Open Sales Orders Detail or Sales by Customer Detail'],
            ['3', 'Set the date range and click OK to run the report'],
            ['4', 'Click "Excel" or "Export" at the top — save as Excel (.xlsx) or CSV'],
            ['5', 'Upload the file below — both formats are supported'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 'var(--gap-m)', alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--navy)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--black)', paddingTop: 2 }}>{text}</div>
            </div>
          ))}
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', background: 'var(--white)', borderRadius: 'var(--r-l)', padding: 'var(--pad-m)', marginTop: 'var(--mar-xs)' }}>
            💡 Tip: Use <strong>Open Sales Orders Detail</strong> or <strong>Sales by Customer Detail</strong> for best results — both include line items. Summary reports work too but won't import individual line items.
          </div>
        </div>
      </div>

      {/* Division selector */}
      <div className="card" style={{ marginBottom: 'var(--mar-l)' }}>
        <div className="card-header"><span className="card-title">Import Settings</span></div>
        <div style={{ padding: 'var(--pad-l)' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', display: 'block', marginBottom: 6 }}>Division</label>
          <div style={{ display: 'flex', gap: 'var(--gap-s)' }}>
            {['LM', 'Bolt'].map(d => (
              <button key={d} onClick={() => setDivision(d)}
                style={{ padding: 'var(--pad-s) var(--pad-xl)', borderRadius: 'var(--r-l)', border: `1px solid ${division === d ? 'var(--navy)' : 'var(--border-l)'}`, background: division === d ? 'var(--navy)' : 'var(--hover)', color: division === d ? '#fff' : 'var(--black)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                {d === 'LM' ? 'Lightning Master' : 'Bolt Lightning'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--navy)' : 'var(--border-l)'}`,
          borderRadius: 'var(--r-m)',
          background: dragOver ? 'var(--blue-soft)' : 'var(--white)',
          padding: 'var(--pad-xxl)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--gap-m)', cursor: 'pointer', transition: 'all 0.15s' }}>
        <FileXls size={44} style={{ color: dragOver ? 'var(--navy)' : 'var(--text-3)' }} />
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: dragOver ? 'var(--navy)' : 'var(--black)' }}>
          Drop your QB export here
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>CSV or Excel (.xlsx) · click to browse</div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div style={{ marginTop: 'var(--mar-m)', padding: 'var(--pad-m)', borderRadius: 'var(--r-l)', background: 'var(--error-soft)', color: 'var(--error-alt)', fontSize: 'var(--text-sm)', display: 'flex', gap: 'var(--gap-s)', alignItems: 'center' }}>
          <Warning size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}
    </div>
  )

  // ── Preview screen ──
  if (step === 'preview') return (
    <div className="page-content fade-in">
      <div style={{ marginBottom: 'var(--mar-l)' }}>
        <button onClick={() => setStep('upload')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: 'var(--text-3)', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 0, marginBottom: 'var(--mar-m)' }}>
          <ArrowLeft size={14} /> Change file
        </button>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--black)', marginBottom: 4 }}>QUICKBOOKS IMPORT</div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 800 }}>Review & Confirm</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginTop: 4 }}>
          {fileName} · {parsed.length} record{parsed.length !== 1 ? 's' : ''} found · {format === 'detail' ? 'Detail format (with line items)' : 'Summary format'}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 'var(--mar-l)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{parsed.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Selected</div>
          <div className="stat-value blue">{selected.size}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Value</div>
          <div className="stat-value amber">
            ${parsed.filter(i => selected.has(i.invoiceNum)).reduce((s, i) => s + i.total, 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Division</div>
          <div className="stat-value" style={{ fontSize: 'var(--text-lg)' }}>{division}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--mar-m)' }}>
        <MagnifyingGlass size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, SO #, or job…"
          style={{ width: '100%', paddingLeft: 30 }} />
        {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={13} /></button>}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--r-m)', overflow: 'hidden', marginBottom: 'var(--mar-l)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--navy)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: 36 }}>
                <input type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              {['SO / Inv #', 'Customer / Job', 'Date', 'Amount', 'Lines', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, idx) => (
              <InvoiceRow key={inv.invoiceNum}
                inv={inv}
                selected={selected.has(inv.invoiceNum)}
                onToggle={toggleOne}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm button */}
      <button onClick={runImport} disabled={selected.size === 0 || importing}
        style={{ width: '100%', padding: 'var(--pad-l)', borderRadius: 'var(--r-m)', background: selected.size === 0 ? 'var(--text-3)' : 'var(--navy)', color: '#fff', fontWeight: 800, fontSize: 'var(--text-md)', cursor: selected.size === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--gap-s)' }}>
        {importing
          ? <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Importing…</>
          : <>Import {selected.size} Sales Order{selected.size !== 1 ? 's' : ''} <ArrowRight size={16} /></>
        }
      </button>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', textAlign: 'center', marginTop: 'var(--mar-s)' }}>
        Each selected record will create a Sales Order and a linked Project in your system.
      </div>
    </div>
  )

  // ── Done screen ──
  if (step === 'done') {
    const created = results.filter(r => r.action === 'created').length
    const skipped = results.filter(r => r.action === 'skipped').length
    const errors  = results.filter(r => r.action === 'error').length
    return (
      <div className="page-content fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--pad-xxl) 0', gap: 'var(--gap-l)' }}>
          <CheckCircle size={52} weight="fill" style={{ color: 'var(--success)' }} />
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Import Complete</div>
          <div style={{ display: 'flex', gap: 'var(--gap-l)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--success)' }}>{created}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--black)' }}>Created</div>
            </div>
            {skipped > 0 && <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--warning)' }}>{skipped}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--black)' }}>Skipped</div>
            </div>}
            {errors > 0 && <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--error)' }}>{errors}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--black)' }}>Errors</div>
            </div>}
          </div>
          {errors > 0 && (
            <div style={{ width: '100%', maxWidth: 480, background: 'var(--error-soft)', borderRadius: 'var(--r-l)', padding: 'var(--pad-m)', textAlign: 'left' }}>
              {results.filter(r => r.action === 'error').map(r => (
                <div key={r.invoiceNum} style={{ fontSize: 'var(--text-xs)', color: 'var(--error-alt)', marginBottom: 4 }}>
                  {r.invoiceNum}: {r.reason}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--gap-m)', marginTop: 'var(--mar-s)' }}>
            <button onClick={() => { setStep('upload'); setParsed([]); setResults([]); setFileName('') }}
              style={{ padding: 'var(--pad-m) var(--pad-xl)', borderRadius: 'var(--r-l)', background: 'transparent', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
              Import Another File
            </button>
            <button onClick={() => navigate('/change-orders')}
              style={{ padding: 'var(--pad-m) var(--pad-xl)', borderRadius: 'var(--r-l)', background: 'var(--navy)', color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--gap-s)' }}>
              View Change Orders <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }
}
