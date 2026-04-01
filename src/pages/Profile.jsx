import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Lock, Eye, EyeSlash, CheckCircle, Shield,
  ArrowLeft, Warning, PencilSimple, SignOut,
  Buildings, AppWindow, Trash, IdentificationCard } from '@phosphor-icons/react'
import { db } from '../lib/supabase.js'
import { logActivity } from '../lib/logActivity.js'
import { Button, IconButton, Card, Badge, Spinner, Surface } from '../components/ui'

// ─── App source for activity logging — derived from VITE_APP_NAME ─────────────
const APP_SOURCE = (import.meta.env.VITE_APP_NAME || 'lmc_platform').toLowerCase().replace(/ /g, '_')
import { useAuth } from '../lib/useAuth.jsx'

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── PIN pad ──────────────────────────────────────────────────────────────────
function PinPad({ onComplete }) {
  const [digits, setDigits] = useState([])
  const press = (d) => {
    const next = [...digits, d]
    setDigits(next)
    if (next.length === 6) { onComplete(next.join('')); setDigits([]) }
  }
  const del = () => setDigits(d => d.slice(0, -1))

  return (
    <div>
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 'var(--radius-round)', background: i < digits.length ? 'var(--brand-primary)' : 'var(--border-subtle)', transition: 'background 0.1s' }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} className="pin-btn">
            {n}
          </button>
        ))}
        <div />
        <button onClick={() => press('0')} className="pin-btn">
          0
        </button>
        <button onClick={del} className="pin-btn text-lg">
          ⌫
        </button>
      </div>
    </div>
  )
}

// ─── Badge components ───────────────────────────────────────────────────────
function RoleBadge({ label, color = 'var(--brand-primary)', bg = 'rgba(4,36,92,0.08)' }) {
  return (
    <Badge style={{ color, background: bg }}>
      {label}
    </Badge>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children, action }) {
  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between p-4 pl-5 bg-brand-primary rounded-none">
        <div className="flex items-center gap-2 text-surface-base text-sm font-bold">
          {Icon && <Icon size="0.9375rem" />} {title}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
      <div className="text-xs font-bold text-text-primary">{label}</div>
      <div className="text-sm font-semibold text-text-primary text-right">{children}</div>
    </div>
  )
}

// ─── Activity Log Component ───────────────────────────────────────────────────
function ActivityLog({ userId }) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const PER_PAGE = 10

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    db.from('user_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * PER_PAGE, (page + 1) * PER_PAGE - 1)
      .then(({ data }) => {
        setLogs(data || [])
        setLoading(false)
      })
  }, [userId, page])

  const fmtTime = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    const diffH   = Math.floor(diffMs / 3600000)
    const diffD   = Math.floor(diffMs / 86400000)
    if (diffMin < 1)  return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffH   < 24) return `${diffH}h ago`
    if (diffD   < 7)  return `${diffD}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const APP_LABELS = { field_ops: 'Field Ops', warehouse_iq: 'Warehouse IQ', mission_control: 'Mission Control' }

  const CATEGORY_COLOR = {
    sales_order: 'var(--state-info)', fulfillment: 'var(--purple)', shipment: 'var(--state-info)',
    import: 'var(--warning-text)',      profile: 'var(--grey-shade-20)',     auth: 'var(--grey-base)',
    parts: 'var(--success-dark)',       inventory: 'var(--success-dark)',   transfer: 'var(--warning-text)' }

  return (
    <Card className="mb-6">
      <div className="p-4 pl-5 bg-brand-primary text-surface-base text-sm font-bold">
        Activity Log
      </div>
      <div className="py-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-sm">
            No activity recorded yet
          </div>
        ) : (
          <>
            {logs.map((log, i) => (
              <div key={log.id} className={`flex items-start gap-3 p-4 pl-5 ${i < logs.length - 1 ? 'border-b border-border-subtle' : ''}`}>
                {/* Category dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: 'var(--radius-round)', flexShrink: 0, marginTop: 'var(--space-xs)',
                  background: CATEGORY_COLOR[log.category] || 'var(--text-muted)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium leading-relaxed">
                    {log.label}
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap items-center">
                    <span className="text-xs text-text-muted">{fmtTime(log.created_at)}</span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs font-semibold" style={{ color: CATEGORY_COLOR[log.category] || 'var(--text-muted)' }}>
                      {APP_LABELS[log.app] || log.app}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {/* Pagination */}
            <div className="flex justify-between items-center p-4 pl-5">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-xs font-semibold text-brand-primary disabled:text-text-muted bg-none cursor-pointer disabled:cursor-default p-0">
                ← Previous
              </button>
              <span className="text-xs text-text-muted">Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={logs.length < PER_PAGE}
                className="text-xs font-semibold text-brand-primary disabled:text-text-muted bg-none cursor-pointer disabled:cursor-default p-0">
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  // Identity editing
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]         = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving]   = useState(false)

  // Password
  const [showPwForm, setShowPwForm] = useState(false)
  const [newEmail, setNewEmail]     = useState('')
  const [newPw, setNewPw]           = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [pwSaving, setPwSaving]     = useState(false)

  // PIN
  const [pinSection, setPinSection] = useState('idle') // idle | verify-old | enter-new | confirm-new
  const [newPin, setNewPin]         = useState('')
  const [pinError, setPinError]     = useState('')
  const [removingPin, setRemovingPin] = useState(false)
  const hasPin = !!profile?.pin_hash

  // Flash
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')
  const flash = (msg, isErr = false) => {
    if (isErr) { setError(msg); setSuccess('') }
    else { setSuccess(msg); setError('') }
    setTimeout(() => { setError(''); setSuccess('') }, 4000)
  }

  const saveName = async () => {
    if (!nameVal.trim()) return
    setNameSaving(true)
    const { error } = await db.from('profiles').update({ full_name: nameVal.trim() }).eq('id', user.id)
    setNameSaving(false)
    if (error) { flash('Could not save name.', true); return }
    setEditingName(false)
    flash('Name updated.')
    logActivity(db, user?.id, APP_SOURCE, { category: 'profile', action: 'updated_name', label: 'Updated display name' })
  }

  const savePassword = async () => {
    if (!newPw || newPw.length < 8) { flash('Password must be at least 8 characters.', true); return }
    setPwSaving(true)
    const { error } = await db.auth.updateUser({ password: newPw, ...(newEmail ? { email: newEmail } : {}) })
    setPwSaving(false)
    if (error) { flash(error.message, true); return }
    setShowPwForm(false); setNewPw(''); setNewEmail('')
    logActivity(db, user?.id, APP_SOURCE, { category: 'profile', action: 'updated_password', label: newEmail ? 'Updated email and password' : 'Changed password' })
    flash(newEmail ? 'Email + password updated. Check your inbox to confirm.' : 'Password updated.')
  }

  const handlePinStep = async (pin) => {
    setPinError('')
    if (pinSection === 'verify-old') {
      const hashed = await hashPin(pin)
      const { data } = await db.from('profiles').select('pin_hash').eq('id', user.id).single()
      if (data?.pin_hash !== hashed) { setPinError('Incorrect PIN. Try again.'); return }
      setPinSection('enter-new')
    } else if (pinSection === 'enter-new') {
      setNewPin(pin); setPinSection('confirm-new')
    } else if (pinSection === 'confirm-new') {
      if (pin !== newPin) { setPinError("PINs don't match. Try again."); setPinSection('enter-new'); setNewPin(''); return }
      const hashed = await hashPin(pin)
      const { error } = await db.from('profiles').update({ pin_hash: hashed, pin_set_at: new Date().toISOString() }).eq('id', user.id)
      if (error) { setPinError('Could not save PIN.'); return }
      setPinSection('idle'); setNewPin('')
      flash('PIN updated. You can now log in with your PIN.')
      logActivity(db, user?.id, APP_SOURCE, { category: 'profile', action: 'updated_pin', label: 'Changed login PIN' })
    }
  }

  const removePin = async () => {
    if (!confirm('Remove your PIN? You will need to use your password to log in.')) return
    setRemovingPin(true)
    await db.from('profiles').update({ pin_hash: null, pin_set_at: null }).eq('id', user.id)
    setRemovingPin(false)
    flash('PIN removed.')
  }

  const pinLabel = {
    'verify-old':  'Enter your current PIN to continue',
    'enter-new':   hasPin ? 'Enter your new PIN' : 'Choose a 6-digit PIN',
    'confirm-new': 'Confirm your PIN' }

  const roleColors = {
    admin:   { color: 'var(--state-error-text)', bg: 'var(--state-error-soft)' },
    manager: { color: 'var(--state-info)', bg: 'var(--state-info-soft)' },
    user:    { color: 'var(--state-success-text)', bg: 'var(--state-success-soft)' } }
  const roleStyle = roleColors[profile?.role] || roleColors.user

  const pipelineRoleColors = {
    warehouse_manager: { color: 'var(--purple-shade-20)', bg: 'var(--purple-soft)' },
    fulfillment:       { color: 'var(--state-info)', bg: 'var(--state-info-soft)' },
    shipping:          { color: 'var(--blue-shade-20)', bg: 'var(--blue-tint-80)' } }
  const pipelineStyle = pipelineRoleColors[profile?.pipeline_role] || null

  const appLabels = {
    'field-ops':     'Field Ops',
    'warehouse-iq':  'Warehouse IQ',
    'mission-control': 'Mission Control' }

  // Avatar initials
  const initials = (profile?.full_name || profile?.email || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="page-content fade-in">

      {/* Header */}
      <div className="mb-12">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 bg-none text-text-muted text-xs cursor-pointer p-0 mb-3">
          <ArrowLeft size="0.875rem" /> Back
        </button>
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center text-surface-base text-xl font-black flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-xs font-bold text-text-primary mb-1">ACCOUNT</div>
            <div className="text-base font-black leading-tight">{profile?.full_name || 'My Profile'}</div>
            <div className="text-xs text-text-muted mt-0.5">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Flash messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-soft rounded-lg text-success-text text-sm mb-4">
          <CheckCircle size="0.9375rem" weight="fill" className="flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-soft rounded-lg text-error-alt text-sm mb-4">
          <Warning size="0.9375rem" className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Identity ── */}
      <Section icon={User} title="Identity"
        action={!editingName && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1 text-surface-base bg-white/15">
            <PencilSimple size="0.75rem" /> Edit Name
          </Button>
        )}>

        {editingName ? (
          <div className="mb-3">
            <label className="text-xs font-bold text-text-primary block mb-1">Full Name</label>
            <div className="flex gap-2">
              <input value={nameVal} onChange={e => setNameVal(e.target.value)} autoFocus className="flex-1" onKeyDown={e => e.key === 'Enter' && saveName()} />
              <Button onClick={saveName} disabled={nameSaving}>
                {nameSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => { setEditingName(false); setNameVal(profile?.full_name || '') }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Row label="Full Name">{profile?.full_name || '—'}</Row>
        )}

        <Row label="Email">{user?.email || '—'}</Row>

        {profile?.division && (
          <Row label="Division">
            <span className="flex items-center gap-1">
              <Buildings size="0.8125rem" className="text-text-primary" />
              {profile.division}
            </span>
          </Row>
        )}

        <div className="flex items-center justify-between pb-3 mb-1 border-b border-border-l">
          <div className="text-xs font-bold text-text-primary">Member Since</div>
          <div className="text-sm font-semibold text-text-primary">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </div>
        </div>
      </Section>

      {/* ── Access & Roles ── */}
      <Section icon={Shield} title="Access & Roles">

        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-l">
          <div className="text-xs font-bold text-text-primary">App Role</div>
          <RoleBadge label={profile?.role || 'user'} color={roleStyle.color} bg={roleStyle.bg} />
        </div>

        {profile?.pipeline_role && pipelineStyle && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-l">
            <div className="text-xs font-bold text-text-primary">Pipeline Role</div>
            <RoleBadge label={profile.pipeline_role.replace('_', ' ')} color={pipelineStyle.color} bg={pipelineStyle.bg} />
          </div>
        )}

        {profile?.app_access?.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-bold text-text-primary mb-2">App Access</div>
            <div className="flex flex-wrap gap-1">
              {profile.app_access.map(app => (
                <span key={app} className="inline-flex items-center gap-1 p-1 px-2.5 rounded-sm bg-surface-hover text-text-primary text-xs font-semibold">
                  <AppWindow size="0.75rem" />
                  {appLabels[app] || app}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 bg-surface-hover rounded-lg text-xs text-text-muted leading-relaxed">
          Role assignments are managed by your administrator. Contact admin to request changes.
        </div>
      </Section>

      {/* ── PIN ── */}
      <Section icon={Lock} title={hasPin ? 'Login PIN' : 'Set Up PIN'}
        action={pinSection !== 'idle' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setPinSection('idle'); setPinError(''); setNewPin('') }}
            className="text-surface-base bg-white/15">
            Cancel
          </Button>
        )}>

        {pinSection === 'idle' ? (
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div>
                <div className="text-sm font-semibold">{hasPin ? '6-digit PIN is set ✓' : 'No PIN set'}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {hasPin
                    ? `Last set: ${profile?.pin_set_at ? new Date(profile.pin_set_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown'}`
                    : 'Set a PIN to log in faster — no password needed'}
                </div>
              </div>
              <Button
                onClick={() => setPinSection(hasPin ? 'verify-old' : 'enter-new')}
                className="whitespace-nowrap">
                {hasPin ? 'Change PIN' : 'Set PIN'}
              </Button>
            </div>

            {hasPin && (
              <button onClick={removePin} disabled={removingPin}
                className="flex items-center gap-1 bg-none text-error-alt text-xs font-semibold cursor-pointer p-0">
                <Trash size="0.8125rem" /> {removingPin ? 'Removing…' : 'Remove PIN'}
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="text-center mb-4">
              <div className="text-base font-bold mb-1">{pinLabel[pinSection]}</div>
              {pinError && (
                <div className="flex items-center justify-center gap-1 text-error-alt text-sm mt-2">
                  <Warning size="0.875rem" /> {pinError}
                </div>
              )}
            </div>
            <PinPad onComplete={handlePinStep} />
          </div>
        )}
      </Section>

      {/* ── Password & Email ── */}
      <Section icon={Lock} title="Password & Email"
        action={!showPwForm && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowPwForm(true)}
            className="flex items-center gap-1 text-surface-base bg-white/15">
            <PencilSimple size="0.75rem" /> Change
          </Button>
        )}>

        {showPwForm ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">New Email (optional)</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" style={{ paddingRight: 'var(--sp-10)' }} />
                <button onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none cursor-pointer text-text-muted p-0 flex">
                  {showPw ? <EyeSlash size="1rem" /> : <Eye size="1rem" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowPwForm(false); setNewPw(''); setNewEmail('') }}
                className="flex-1">
                Cancel
              </Button>
              <Button onClick={savePassword} disabled={pwSaving} className="flex-2">
                {pwSaving ? 'Saving…' : 'Update Password'}
              </Button>
            </div>
          </div>
        ) : (
          <Row label="Password">
            <span className="text-text-muted">••••••••</span>
          </Row>
        )}
      </Section>

      {/* ── Sign out ── */}
      <Card className="mb-20">
        <div className="p-4 pl-5 bg-brand-primary text-surface-base text-sm font-bold">Session</div>
        <div className="p-5">
          <button onClick={() => { signOut(); navigate('/login', { replace: true }) }}
            className="flex items-center gap-2 bg-none text-error-alt font-bold text-sm cursor-pointer p-0">
            <SignOut size="1rem" /> Sign Out of this app
          </button>
        </div>
      </Card>

    </div>
  )
}
