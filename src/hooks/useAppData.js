import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/supabase'

export function useAppData() {
  const [leads, setLeads] = useState([])
  const [rels, setRels] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState({ permits: true, rels: true, tasks: true })
  const [setupNeeded, setSetupNeeded] = useState(false)

  const load = useCallback(async () => {
    const { data: ld, error: le } = await db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (le?.code === 'PGRST205') setSetupNeeded(true)
    else setLeads(ld || [])
    setLoading((x) => ({ ...x, permits: false }))

    const { data: rd } = await db
      .from('relationships')
      .select('*')
      .order('tier')
      .order('company_name')
    setRels(rd || [])
    setLoading((x) => ({ ...x, rels: false }))

    const { data: td } = await db
      .from('tasks')
      .select('*')
      .order('due_date')
      .order('created_at', { ascending: false })
    setTasks(td || [])
    setLoading((x) => ({ ...x, tasks: false }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveLead = async (f) => {
    const d = { ...f, value_int: parseInt((f.value_str || '').replace(/[^0-9]/g, '')) || 0 }
    if (d.id) await db.from('leads').update(d).eq('id', d.id)
    else await db.from('leads').insert(d)
    load()
  }

  const saveRel = async (f) => {
    if (f.id) await db.from('relationships').update(f).eq('id', f.id)
    else await db.from('relationships').insert(f)
    load()
  }

  const saveTask = async (f) => {
    if (f.id) await db.from('tasks').update(f).eq('id', f.id)
    else await db.from('tasks').insert(f)
    load()
  }

  const toggleTask = async (t) => {
    await db.from('tasks').update({ done: !t.done }).eq('id', t.id)
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
  }

  return { leads, rels, tasks, loading, setupNeeded, saveLead, saveRel, saveTask, toggleTask, reload: load }
}
