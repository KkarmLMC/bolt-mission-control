export const fmt$ = (v) => {
  if (!v) return '—'
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v}`
}

export const today = () => new Date().toISOString().split('T')[0]

export const fmtDate = (d) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

export const dueClass = (d) => {
  if (!d) return 'due-later'
  const diff = Math.floor((new Date(d) - new Date(today())) / 864e5)
  if (diff < 0) return 'due-overdue'
  if (diff === 0) return 'due-today'
  if (diff <= 7) return 'due-week'
  return 'due-later'
}

export const dueLabel = (d) => {
  if (!d) return 'No date'
  const diff = Math.floor((new Date(d) - new Date(today())) / 864e5)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return fmtDate(d)
}

export const prioClass = (p) =>
  p?.includes('CRITICAL') ? 'p-critical' : p?.includes('HIGH') ? 'p-high' : p?.includes('MEDIUM') ? 'p-medium' : 'p-pipeline'

export const prioBadge = (p) =>
  p?.includes('CRITICAL') ? 'badge-critical' : p?.includes('HIGH') ? 'badge-high' : p?.includes('MEDIUM') ? 'badge-medium' : 'badge-pipeline'

export const statusBadge = (s) =>
  ({
    'NEW LEAD': 'badge-new',
    CONTACTED: 'badge-contacted',
    'MEETING SET': 'badge-meeting',
    'PROPOSAL SENT': 'badge-proposal',
    'ON BID LIST': 'badge-bidlist',
    'BID SUBMITTED': 'badge-bid',
    'WON ✓': 'badge-won',
    'LOST ✗': 'badge-lost',
    'ON HOLD': 'badge-hold',
  }[s] || 'badge-hold')
