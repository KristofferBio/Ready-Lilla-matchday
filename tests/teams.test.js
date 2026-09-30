import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { DEFAULT_TEAMS, loadTeams, saveTeams } from '../src/teams.js'

beforeEach(() => {
  const items = new Map()
  globalThis.localStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
  }
})

test('existing installations keep the original team IDs', () => {
  assert.deepEqual(loadTeams(), DEFAULT_TEAMS)
  assert.deepEqual(loadTeams().map(team => team.id), ['ready-lilla', 'ready-gronn'])
})

test('new teams and removal persist across reloads', () => {
  const team = { id: 'team-123', name: 'Ready Blå', color: 'blue' }
  saveTeams([...DEFAULT_TEAMS, team])
  assert.deepEqual(loadTeams(), [...DEFAULT_TEAMS, team])
  saveTeams([team])
  assert.deepEqual(loadTeams(), [team])
})

test('removing the last team does not restore default teams', () => {
  saveTeams([])
  assert.deepEqual(loadTeams(), [])
})

test('invalid and duplicate entries are ignored, unknown colors fall back', () => {
  saveTeams([
    null,
    { id: '../invalid', name: 'Invalid' },
    { id: 'empty', name: ' ' },
    { id: 'team-123', name: ' Ready Blå ', color: 'unknown' },
    { id: 'team-123', name: 'Duplicate', color: 'blue' },
  ])
  assert.deepEqual(loadTeams(), [{ id: 'team-123', name: 'Ready Blå', color: 'purple' }])
})

test('corrupt storage falls back to defaults', () => {
  globalThis.localStorage.setItem('kampstotte_teams', '{broken')
  assert.deepEqual(loadTeams(), DEFAULT_TEAMS)
})

test('storage failures are reported to callers', () => {
  globalThis.localStorage.setItem = () => { throw new Error('Storage full') }
  assert.throws(() => saveTeams([]), /Storage full/)
})
