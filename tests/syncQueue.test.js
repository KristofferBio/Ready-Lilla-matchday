import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSyncQueue } from '../src/syncQueue.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

test('offline changes survive reload and retry until acknowledged', async () => {
  const storage = memoryStorage()
  const queue = createSyncQueue({ storage, write: async () => { throw new Error('offline') } })
  queue.enqueue('teams/test', { squad: [{ id: '1' }] })
  // Let the in-flight failed request finish.
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(queue.error('teams/test'), 'offline')
  assert.ok(queue.pending('teams/test'))
  const sent = []
  const reopened = createSyncQueue({ storage, write: async (key, data) => sent.push({ key, data }) })
  assert.deepEqual(reopened.pending('teams/test').data.squad, [{ id: '1' }])
  await reopened.flush('teams/test')
  assert.equal(sent.length, 1)
  assert.equal(reopened.pending('teams/test'), null)
})

test('an older acknowledgement cannot discard a newer edit', async () => {
  let finish
  const sent = []
  const queue = createSyncQueue({ storage: memoryStorage(), write: (key, data) => {
    sent.push(data)
    return new Promise(resolve => { finish = resolve })
  } })
  queue.enqueue('teams/test', { positions: { '3-3-2': { fc: '1' } } })
  const firstId = queue.pending('teams/test').id
  queue.enqueue('teams/test', { positions: { '3-3-2': { fc: '2' } }, subLog: [{ inId: '2', outId: '1' }] })
  queue.acknowledge('teams/test', firstId)
  assert.equal(queue.pending('teams/test').data.positions['3-3-2'].fc, '2')
  finish()
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(sent.length, 2)
  assert.equal(sent[1].positions['3-3-2'].fc, '2')
  finish()
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(queue.pending('teams/test'), null)
})

test('a substitution is sent as one complete write, including cleared maps', async () => {
  let written
  const queue = createSyncQueue({ storage: memoryStorage(), write: async (key, data) => { written = data } })
  const change = {
    positions: { '3-3-2': { fc: '2' } },
    subLog: [{ minute: 4, inId: '2', outId: '1' }],
    playMinutes: { '1': 4 }, fieldStartMinute: { '2': 4 },
  }
  queue.enqueue('teams/test', change)
  assert.deepEqual(queue.pending('teams/test').data, change)
  await Promise.resolve()
  await Promise.resolve()
  for (const field of Object.keys(change)) assert.deepEqual(written[field], change[field])
  queue.enqueue('teams/test', { fieldStartMinute: {}, subLog: [] })
  assert.deepEqual(written.fieldStartMinute, {})
  assert.deepEqual(written.subLog, [])
})

test('queued field updates compact without losing unrelated unsent changes', async () => {
  const queue = createSyncQueue({ storage: memoryStorage(), write: () => new Promise(() => {}) })
  queue.enqueue('teams/test', { squad: [{ id: '1' }], positions: { old: { fc: '1' } } })
  const version = queue.version('teams/test')
  queue.enqueue('teams/test', { positions: {} })
  assert.deepEqual(queue.pending('teams/test').data, { squad: [{ id: '1' }], positions: {} })
  assert.ok(queue.version('teams/test') > version)
  assert.equal(queue.pending('clock/test'), null)
})

test('storage failure stops an edit before contacting the cloud', () => {
  const storage = memoryStorage()
  storage.setItem = () => { throw new Error('quota') }
  let sent = false
  const queue = createSyncQueue({ storage, write: async () => { sent = true } })
  assert.throws(() => queue.enqueue('teams/test', { positions: {} }), /quota/)
  assert.equal(sent, false)
})

test('late cloud updates cannot overwrite edits, even after acknowledgement', () => {
  const queue = createSyncQueue({ storage: memoryStorage(), write: () => new Promise(() => {}) })
  const versionBeforeEdit = queue.version('teams/test')
  assert.equal(queue.canApply('teams/test', versionBeforeEdit), true)
  queue.enqueue('teams/test', { positions: {} })
  assert.equal(queue.canApply('teams/test', versionBeforeEdit), false)
  assert.equal(queue.canApply('teams/test', queue.version('teams/test')), false)
  queue.acknowledge('teams/test', queue.pending('teams/test').id)
  assert.equal(queue.canApply('teams/test', versionBeforeEdit), false)
  assert.equal(queue.canApply('teams/test', queue.version('teams/test')), true)
})

test('clock changes survive reopening independently of match data', async () => {
  const storage = memoryStorage()
  const offline = createSyncQueue({ storage, write: () => new Promise(() => {}) })
  const clock = { running: true, virtualStart: 123456, elapsed: 60 }
  offline.enqueue('clock/test', clock)
  const reopened = createSyncQueue({ storage, write: async () => {} })
  assert.deepEqual(reopened.pending('clock/test').data, clock)
  assert.equal(reopened.pending('teams/test'), null)
  await reopened.flush('clock/test')
  assert.equal(reopened.pending('clock/test'), null)
})

test('acknowledgement retains the complete local snapshot after reopening', async () => {
  const storage = memoryStorage()
  const queue = createSyncQueue({ storage, write: async () => {} })
  queue.enqueue('teams/test', { positions: {}, subLog: [] }, { squad: [{ id: '1' }], formation: '3-4-1' })
  await Promise.resolve()
  await Promise.resolve()
  const reopened = createSyncQueue({ storage, write: async () => {} })
  assert.equal(reopened.pending('teams/test'), null)
  assert.deepEqual(reopened.snapshot('teams/test'), {
    squad: [{ id: '1' }], formation: '3-4-1', positions: {}, subLog: [],
  })
})

test('legacy pending patches migrate without discarding their unsent fields', () => {
  const storage = memoryStorage()
  storage.setItem('kampstotte_pending_teams/test', JSON.stringify({ id: 'legacy', data: { subLog: [{ inId: '1' }] } }))
  const queue = createSyncQueue({ storage, write: () => new Promise(() => {}) })
  queue.enqueue('teams/test', { positions: {} }, { squad: [{ id: '1' }], formation: '3-4-1' })
  assert.deepEqual(queue.pending('teams/test').data, { subLog: [{ inId: '1' }], positions: {} })
  assert.equal(queue.snapshot('teams/test').squad[0].id, '1')
})

test('failed acknowledgement keeps the change available for retry', async () => {
  const storage = memoryStorage()
  let finish
  const queue = createSyncQueue({ storage, write: () => new Promise(resolve => { finish = resolve }) })
  queue.enqueue('teams/test', { positions: {} })
  storage.setItem = () => { throw new Error('quota') }
  finish()
  await Promise.resolve()
  await Promise.resolve()
  assert.ok(queue.pending('teams/test'))
  assert.equal(queue.error('teams/test'), 'quota')
})

test('corrupt records and unavailable storage are not silently overwritten', () => {
  const storage = memoryStorage()
  storage.setItem('kampstotte_pending_teams/test', '{broken')
  const queue = createSyncQueue({ storage, write: async () => {} })
  assert.equal(queue.snapshot('teams/test'), null)
  assert.throws(() => queue.enqueue('teams/test', { positions: {} }))
  assert.equal(storage.getItem('kampstotte_pending_teams/test'), '{broken')
  storage.getItem = () => { throw new Error('unavailable') }
  assert.equal(queue.snapshot('teams/other'), null)
  assert.throws(() => queue.enqueue('teams/other', { positions: {} }), /unavailable/)
})
