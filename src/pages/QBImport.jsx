import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadSimple, FileCsv, CheckCircle, Warning,
  ArrowLeft, MagnifyingGlass, Trash, ArrowRight,
  Table, X, FileXls, Question, GearSix } from '@phosphor-icons/react'
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
  itemDesc:     ['Item', 'Description', 'Item Description', 'Product/Service', 'Service Description', 'Memo'],
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

    // QB Desktop adds a "QuickBooks Desktop Export Tips" sheet as sheet 0.
    // Find the first sheet that contains actual QB data headers.
    let ws, raw
    for (const name of wb.SheetNames) {
      const candidate = wb.Sheets[name]
      const candidateRows = xlsxUtils.sheet_to_json(candidate, { header: 1, defval: '' })
      if (!candidateRows.length) continue
      // Check first 5 rows for QB header keywords
      const hasHeaders = candidateRows.slice(0, 5).some(row => {
        const str = row.map(c => String(c || '')).join(' ').toLowerCase()
        return (str.includes('type') && str.includes('num')) || (str.includes('date') && str.includes('name'))
      })
      if (hasHeaders) { ws = candidate; raw = candidateRows; break }
    }

    // Fallback: if no sheet matched, use the last sheet (often the data sheet)
    if (!raw) {
      const lastName = wb.SheetNames[wb.SheetNames.length - 1]
      ws = wb.Sheets[lastName]
      raw = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' })
    }
    if (!raw.length) return { headers: [], rows: [], error: 'No data found in any sheet' }

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
        jobName:    jobFromName || get(jobIdx),
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

  // Recalculate totals from line items when available
  // (Sales by Item reports have per-line amounts, not invoice totals)
  for (const entry of map.values()) {
    if (entry.lineItems.length > 0) {
      const lineTotal = entry.lineItems.reduce((sum, li) => sum + li.amount, 0)
      if (lineTotal > entry.total) entry.total = lineTotal
    }
  }

  return Array.from(map.values())
}

// ─── Preview row ───────────────────────────────────────────────────────────────
function InvoiceRow({ inv, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr className="qb-import__row" style={{ background: selected ? 'var(--state-info-soft)' : 'transparent' }}
        onClick={() => onToggle(inv.invoiceNum)}>
        <td className="qb-import__cell-checkbox">
          <input type="checkbox" checked={selected} onChange={() => onToggle(inv.invoiceNum)}
            onClick={e => e.stopPropagation()} />
        </td>
        <td className="qb-import__cell-mono">{inv.invoiceNum}</td>
        <td className="qb-import__cell-customer">
          <div className="qb-import__customer-name">{inv.customer}</div>
          {inv.jobName && <div className="qb-import__customer-job">{inv.jobName}</div>}
        </td>
        <td className="qb-import__cell-date">{inv.date}</td>
        <td className="qb-import__cell-amount">
          ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
        <td className="qb-import__cell-lines">
          <span>{inv.lineItems.length} lines</span>
        </td>
        <td className="qb-import__cell-expand">
          {inv.lineItems.length > 0 && (
            <button onClick={e => { e.stopPropagation(); setExpanded(x => !x) }}
              className="qb-import__expand-btn">
              {expanded ? '▲ Hide' : '▼ Show'}
            </button>
          )}
        </td>
      </tr>
      {expanded && inv.lineItems.map((li, i) => (
        <tr key={i} className="qb-import__detail-row">
          <td />
          <td />
          <td colSpan={2} className="qb-import__detail-description">
            {li.description}
          </td>
          <td className="qb-import__detail-amount">
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
      <button onClick={() => navigate(-1)} className="qb-import__back-btn">
        <ArrowLeft size="0.875rem" /> Back
      </button>

      {/* How to export instructions */}
      <div className="card qb-import__instructions">
        <div className="list-card__header"><span className="list-card__title"><Question size="0.875rem" /> How to export from QuickBooks Desktop</span></div>
        <div className="qb-import__instructions-content">
          {[
            ['1', 'Open QuickBooks Desktop and go to Reports → Sales'],
            ['2', 'Choose either Open Sales Orders Detail or Sales by Customer Detail'],
            ['3', 'Set the date range and click OK to run the report'],
            ['4', 'Click "Excel" or "Export" at the top — save as Excel (.xlsx) or CSV'],
            ['5', 'Upload the file below — both formats are supported'],
          ].map(([n, text]) => (
            <div key={n} className="qb-import__instruction-item">
              <div className="qb-import__instruction-number">{n}</div>
              <div className="qb-import__instruction-text">{text}</div>
            </div>
          ))}
          <div className="qb-import__instructions-tip">
            💡 Tip: Use <strong>Open Sales Orders Detail</strong> or <strong>Sales by Customer Detail</strong> for best results — both include line items. Summary reports work too but won't import individual line items.
          </div>
        </div>
      </div>

      {/* Division selector */}
      <div className="card qb-import__settings">
        <div className="list-card__header"><span className="list-card__title"><GearSix size="0.875rem" /> Import Settings</span></div>
        <div className="qb-import__settings-content">
          <label className="qb-import__label">Division</label>
          <div className="qb-import__division-buttons">
            {['LM', 'Bolt'].map(d => (
              <button key={d} onClick={() => setDivision(d)}
                className="qb-import__division-btn" style={{ borderColor: division === d ? 'var(--brand-primary)' : 'var(--border-subtle)', background: division === d ? 'var(--brand-primary)' : 'var(--surface-hover)', color: division === d ? '#fff' : 'var(--text-primary)' }}>
                {d === 'LM' ? 'Lightning Master' : 'Bolt Lightning'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div className="qb-import__drop-zone"
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{ borderColor: dragOver ? 'var(--brand-primary)' : 'var(--border-subtle)', background: dragOver ? 'var(--state-info-soft)' : 'var(--surface-base)' }}>
        <FileXls size="2.75rem" style={{ color: dragOver ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
        <div className="qb-import__drop-zone-title" style={{ color: dragOver ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
          Drop your QB export here
        </div>
        <div className="qb-import__drop-zone-subtitle">CSV or Excel (.xlsx) · click to browse</div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="qb-import__error">
          <Warning size="1rem" className="shrink-0" /> {error}
        </div>
      )}
    </div>
  )

  // ── Preview screen ──
  if (step === 'preview') return (
    <div className="page-content fade-in">
      <button onClick={() => setStep('upload')} className="qb-import__back-btn">
        <ArrowLeft size="0.875rem" /> Change file
      </button>
      <div className="qb-import__preview-meta">
        {`${fileName} · ${parsed.length} record${parsed.length !== 1 ? 's' : ''} found · ${format === 'detail' ? 'Detail format (with line items)' : 'Summary format'}`}
      </div>

      {/* Stats */}
      <div className="stat-grid qb-import__stats">
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
          <div className="stat-value">{division}</div>
        </div>
      </div>

      {/* Search */}
      <div className="qb-import__search">
        <MagnifyingGlass size="0.875rem" className="qb-import__search-icon" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, SO #, or job…"
          className="qb-import__search-input" />
        {search && <button onClick={() => setSearch('')} className="qb-import__search-clear"><X size="0.8125rem" /></button>}
      </div>

      {/* Table */}
      <div className="qb-import__table-container">
        <table className="qb-import__table">
          <thead>
            <tr className="qb-import__table-header">
              <th className="qb-import__table-header-checkbox">
                <input type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              {['SO / Inv #', 'Customer / Job', 'Date', 'Amount', 'Lines', ''].map(h => (
                <th key={h} className="qb-import__table-header-cell">{h}</th>
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
        className="qb-import__import-btn" style={{ background: selected.size === 0 ? 'var(--text-muted)' : 'var(--brand-primary)' }}>
        {importing
          ? <><div className="spinner" style={{ borderTopColor: 'var(--color-white)' }} /> Importing…</>
          : <>Import {selected.size} Sales Order{selected.size !== 1 ? 's' : ''} <ArrowRight size="1rem" /></>
        }
      </button>
      <div className="qb-import__import-note">
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
        <div className="qb-import__result-container">
          <CheckCircle size="3.25rem" weight="fill" style={{ color: 'var(--state-success)' }} />
          <div className="qb-import__result-title">Import Complete</div>
          <div className="qb-import__result-stats">
            <div className="qb-import__result-stat">
              <div className="qb-import__result-stat-value" style={{ color: 'var(--state-success)' }}>{created}</div>
              <div className="qb-import__result-stat-label">Created</div>
            </div>
            {skipped > 0 && <div className="qb-import__result-stat">
              <div className="qb-import__result-stat-value" style={{ color: 'var(--state-warning)' }}>{skipped}</div>
              <div className="qb-import__result-stat-label">Skipped</div>
            </div>}
            {errors > 0 && <div className="qb-import__result-stat">
              <div className="qb-import__result-stat-value" style={{ color: 'var(--state-error)' }}>{errors}</div>
              <div className="qb-import__result-stat-label">Errors</div>
            </div>}
          </div>
          {errors > 0 && (
            <div className="qb-import__result-errors">
              {results.filter(r => r.action === 'error').map(r => (
                <div key={r.invoiceNum} className="qb-import__result-error-item">
                  {r.invoiceNum}: {r.reason}
                </div>
              ))}
            </div>
          )}
          <div className="qb-import__result-actions">
            <button onClick={() => { setStep('upload'); setParsed([]); setResults([]); setFileName('') }}
              className="qb-import__result-btn-secondary">
              Import Another File
            </button>
            <button onClick={() => navigate('/change-orders')}
              className="qb-import__result-btn-primary">
              View Change Orders <ArrowRight size="0.875rem" />
            </button>
          </div>
        </div>
      </div>
    )
  }
}
