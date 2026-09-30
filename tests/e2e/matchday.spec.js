import { test, expect, chromium } from '@playwright/test'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initialMatch, seed, readCloud, prepare, openMatch, synced, substitute, pending } from './helpers.js'

function teamId(prefix = '') { return `test-${prefix}${crypto.randomUUID()}` }

test('emulator-only build: both tap directions save one complete substitution', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id)
  const external = await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await substitute(page)
  await synced(page)
  const first = await readCloud(request, id)
  expect(first.positions['3-4-1']).toEqual({ fc: 'bench' })
  expect(first.playMinutes).toEqual({ field: 2 })
  expect(first.fieldStartMinute).toEqual({ bench: 2 })
  expect(first.subLog).toEqual([{ minute: 2, inId: 'bench', outId: 'field' }])
  await page.getByRole('button', { name: '2 Benk, S', exact: true }).click()
  await page.getByRole('button', { name: /^1\s*Felt/ }).click()
  await synced(page)
  expect((await readCloud(request, id)).subLog).toHaveLength(2)
  expect(external).toEqual([])
  const metadata = await request.get('http://127.0.0.1:4185/Ready-Lilla-matchday/manifest.webmanifest')
  expect((await metadata.json()).scope).toBe('/Ready-Lilla-matchday/')
})

test('PWA opens offline in a new page, retains substitution and syncs after reconnect', async ({ page, context, request, browser }) => {
  const id = teamId()
  await seed(request, id)
  const external = await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await synced(page)
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBeTruthy()
  await context.setOffline(true)
  await substitute(page, true)
  await expect(page.getByRole('status')).toContainText('Uten nett')
  expect((await pending(page, id)).data.subLog).toHaveLength(1)
  await page.close()
  const reopened = await context.newPage()
  await openMatch(reopened)
  await expect(reopened.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
  expect((await pending(reopened, id)).data.fieldStartMinute).toEqual({ bench: 2 })
  await context.setOffline(false)
  await synced(reopened)
  expect(await pending(reopened, id)).toBeNull()
  const secondContext = await browser.newContext()
  try {
    await prepare(secondContext, id)
    const secondPage = await secondContext.newPage()
    await openMatch(secondPage)
    await synced(secondPage)
    await expect(secondPage.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
    expect((await readCloud(request, id)).subLog).toHaveLength(1)
  } finally { await secondContext.close() }
  expect(external).toEqual([])
})

test('clock start, pause, reset cancel and 35-minute auto-pause are preserved', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id)
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await expect(page.getByText('02:00', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await synced(page)
  expect((await readCloud(request, id, 'clock')).running).toBe(false)
  const pausedTime = await page.locator('.font-mono').innerText()
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click()
  await expect(page.getByText(pausedTime, { exact: true })).toBeVisible()
  // Seed the time boundary without waiting for a real 35-minute match.
  const url = `http://127.0.0.1:8085/v1/projects/demo-kampstotte/databases/(default)/documents/clock/${id}`
  await request.patch(url, {
    headers: { Authorization: 'Bearer owner' },
    data: { fields: { running: { booleanValue: true }, elapsed: { integerValue: '0' }, virtualStart: { integerValue: String(Date.now() - 35 * 60 * 1000) } } },
  })
  await expect(page.locator('.font-mono')).toHaveText(/^35:0\d$/)
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
  await synced(page)
  expect((await readCloud(request, id, 'clock')).running).toBe(false)
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await synced(page)
  await request.patch(url, {
    headers: { Authorization: 'Bearer owner' },
    data: { fields: { running: { booleanValue: true }, elapsed: { integerValue: '2100' }, virtualStart: { integerValue: String(Date.now() - 100 * 60 * 1000) } } },
  })
  await expect(page.getByText('00:00', { exact: true })).toBeVisible()
  await synced(page)
  expect((await readCloud(request, id, 'clock')).elapsed).toBe(0)
})

test('denied cloud save remains queued and exposes retry', async ({ page, context, request }) => {
  const id = teamId('denied-')
  await seed(request, id)
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await substitute(page)
  await expect(page.getByRole('status')).toContainText('Synkronisering feilet')
  expect((await pending(page, id)).data.subLog).toHaveLength(1)
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('status')).toContainText('Synkronisering feilet')
  expect((await readCloud(request, id)).subLog).toEqual([])
  await page.reload()
  await expect(page.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
  expect((await pending(page, id)).data.subLog).toHaveLength(1)
})

test('reset replaces cleared maps and log in cloud instead of merging removed keys', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id, { ...initialMatch, playMinutes: { field: 3 }, subLog: [{ minute: 0, inId: 'field', outId: 'bench' }] })
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await page.getByText('Nullstill spilletid', { exact: true }).click()
  await expect(page.getByText('Nullstill spilletid og byttelogg?')).toBeVisible()
  await page.getByRole('button', { name: 'Ja', exact: true }).click()
  await synced(page)
  const data = await readCloud(request, id)
  expect(data.playMinutes).toEqual({})
  expect(data.fieldStartMinute).toEqual({})
  expect(data.subLog).toEqual([])
})

test('newer local edits survive delayed first cloud data', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id)
  await prepare(context, id, {
    squad: initialMatch.squad, positions: initialMatch.positions, formation: initialMatch.formation,
    clock: { running: false, elapsed: 120, virtualStart: null }, field_start_min: { field: 0 },
  })
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/google.firestore.v1.Firestore/Listen/**', async route => { await gate; await route.continue() })
  await openMatch(page)
  await substitute(page)
  release()
  await synced(page)
  await expect(page.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
  expect((await readCloud(request, id)).subLog).toHaveLength(1)
})

test('full local storage rejects the edit with a visible error and unchanged cloud data', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id)
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('kampstotte_pending_')) throw new DOMException('Full storage', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: /^2\s*Benk/ }).click()
  await page.getByRole('button', { name: '1 Felt, S', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Endringen er ikke utført')
  await expect(page.getByRole('button', { name: '1 Felt, S', exact: true })).toBeVisible()
  expect((await readCloud(request, id)).subLog).toEqual([])
})

test('unavailable snapshot storage does not crash the app or claim it cached data', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id)
  await prepare(context, id)
  await context.addInitScript(() => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('kampstotte_pending_')) throw new DOMException('Storage blocked', 'SecurityError')
      return original.call(this, key)
    }
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await openMatch(page)
  await expect(page.getByRole('button', { name: '1 Felt, S', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).not.toHaveText('Synkronisert med skyen')
  await page.getByRole('button', { name: /^2\s*Benk/ }).click()
  await page.getByRole('button', { name: '1 Felt, S', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(errors).toEqual([])
})

test('two tabs receive the same confirmed change without duplicating the substitution log', async ({ page, context, request }) => {
  const id = teamId()
  await seed(request, id)
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  const second = await context.newPage()
  await openMatch(second)
  await synced(second)
  await substitute(page)
  await synced(page)
  await synced(second)
  await expect(second.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
  await second.reload()
  await synced(second)
  expect((await readCloud(request, id)).subLog).toHaveLength(1)
})

test('a new service worker waits without reloading an open match or losing its queue', async ({ page, context, request }) => {
  const id = teamId('denied-')
  await seed(request, id)
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await synced(page)
  await substitute(page)
  await expect(page.getByRole('status')).toContainText('Synkronisering feilet')
  const queued = await pending(page, id)
  const scriptPath = new URL('../../dist-e2e/sw.js', import.meta.url)
  const original = await readFile(scriptPath, 'utf8')
  let navigations = 0
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++ })
  try {
    await page.evaluate(() => { window.e2eController = navigator.serviceWorker.controller })
    await writeFile(scriptPath, `// New test version ${crypto.randomUUID()}\n${original}`)
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update() })
    await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting)).toBeTruthy()
    expect(await page.evaluate(() => navigator.serviceWorker.controller === window.e2eController)).toBe(true)
    expect(navigations).toBe(0)
    expect((await pending(page, id)).id).toBe(queued.id)
  } finally { await writeFile(scriptPath, original) }
})

test('an offline queued match survives closing and restarting the entire browser profile', async ({ request }) => {
  const id = teamId()
  await seed(request, id)
  // Short path: Chromium's service-worker storage fails with deeply nested
  // OneDrive + test-results paths on Windows. Never reuse a user's profile.
  const profileRoot = process.env.E2E_PROFILE_ROOT ?? join(tmpdir(), 'opencode')
  await mkdir(profileRoot, { recursive: true })
  const profile = await mkdtemp(join(profileRoot, 'ks-pwa-'))
  const baseURL = 'http://127.0.0.1:4185/Ready-Lilla-matchday/'
  let context = await chromium.launchPersistentContext(profile, { headless: true, baseURL })
  try {
    await prepare(context, id)
    const page = context.pages()[0]
    await openMatch(page)
    await synced(page)
    await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active)).toBeTruthy()
    await page.reload()
    await synced(page)
    await context.setOffline(true)
    await substitute(page)
    expect(await pending(page, id)).not.toBeNull()
    await context.close()
    context = await chromium.launchPersistentContext(profile, { headless: true, baseURL, offline: true })
    await prepare(context, id)
    const reopened = context.pages()[0]
    await openMatch(reopened)
    await expect(reopened.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
    expect((await pending(reopened, id)).data.subLog).toHaveLength(1)
    await context.setOffline(false)
    await synced(reopened)
    expect(await pending(reopened, id)).toBeNull()
    expect((await readCloud(request, id)).subLog).toHaveLength(1)
  } finally { await context.close() }
})
