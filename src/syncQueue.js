// A durable, compacted outbox. Acknowledging an old request must never remove
// a newer edit. Kept independent of Firebase so reconnect/reload can be tested.
export function createSyncQueue({ storage, write, onChange = () => {} }) {
  const prefix = 'kampstotte_pending_'
  const running = new Set()
  const errors = new Map()
  const readErrors = new Map()
  const localErrors = new Map()
  const versions = new Map()

  function record(key) {
    try {
      const raw = storage.getItem(prefix + key)
      const entry = raw ? JSON.parse(raw) : null
      readErrors.delete(key)
      return entry
    } catch (error) {
      readErrors.set(key, error)
      errors.set(key, 'Lokal lagring er utilgjengelig eller skadet. Ikke slett data før de er sikret.')
      localErrors.set(key, errors.get(key))
      return null
    }
  }

  function pending(key) {
    const entry = record(key)
    return entry?.pending === false ? null : entry
  }

  function snapshot(key) {
    const entry = record(key)
    return entry?.snapshot ?? entry?.data ?? null
  }

  function cache(key, data) {
    if (pending(key)) return
    const current = snapshot(key)
    try {
      if (readErrors.has(key)) throw readErrors.get(key)
      storage.setItem(prefix + key, JSON.stringify({ pending: false, snapshot: { ...current, ...data } }))
      errors.delete(key)
      localErrors.delete(key)
      return true
    } catch {
      errors.set(key, 'Kunne ikke mellomlagre skydata på denne enheten.')
      localErrors.set(key, errors.get(key))
      onChange()
      return false
    }
  }

  function acknowledge(key, id) {
    const entry = pending(key)
    if (!entry || entry.id !== id) return false
    // Keep the local snapshot in the SAME atomic record as the outbox.
    // A crash after acknowledgement must not revert to an older local cache.
    try { storage.setItem(prefix + key, JSON.stringify({ ...entry, pending: false })) }
    catch (error) { errors.set(key, error.message); localErrors.set(key, error.message); onChange(); return false }
    errors.delete(key)
    localErrors.delete(key)
    onChange()
    return true
  }

  async function flush(key) {
    if (running.has(key)) return
    running.add(key)
    try {
      let entry = pending(key)
      while (entry) {
        await write(key, { ...entry.data, _syncWriteId: entry.id })
        const acknowledged = acknowledge(key, entry.id)
        if (!acknowledged && pending(key)?.id === entry.id) return
        entry = pending(key)
      }
      if (!localErrors.has(key)) errors.delete(key)
    } catch (error) {
      errors.set(key, error.message || 'Synkronisering feilet')
    } finally {
      running.delete(key)
      onChange()
    }
  }

  function enqueue(key, data, baseline = {}) {
    const entry = {
      id: crypto.randomUUID(), pending: true,
      data: { ...pending(key)?.data, ...data },
      snapshot: { ...baseline, ...snapshot(key), ...data },
    }
    if (readErrors.has(key)) throw readErrors.get(key)
    storage.setItem(prefix + key, JSON.stringify(entry))
    versions.set(key, (versions.get(key) ?? 0) + 1)
    errors.delete(key)
    localErrors.delete(key)
    onChange()
    void flush(key)
  }

  return {
    enqueue, flush, pending, acknowledge, snapshot, cache,
    version: key => versions.get(key) ?? 0,
    canApply: (key, version) => !pending(key) && (versions.get(key) ?? 0) === version,
    error: key => errors.get(key),
    localError: key => localErrors.get(key),
    externalChange: key => { versions.set(key, (versions.get(key) ?? 0) + 1); onChange() },
  }
}
