import { test, expect } from '@playwright/test'
import { initialMatch, seed, prepare, openMatch, synced, substitute, readCloud } from './helpers.js'
import { FORMATIONS } from '../../src/formations.js'

function withBench(count = 8) {
  return {
    ...initialMatch,
    squad: [initialMatch.squad[0], ...Array.from({ length: count }, (_, i) => ({
      id: i === 0 ? 'bench' : `bench-${i}`, number: i + 2,
      name: i === 0 ? 'Benk' : i === 1 ? 'Langt spillernavn' : `Spiller ${i + 2}`,
    }))],
  }
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = selector => {
      const rect = document.querySelector(selector).getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }
    return { pitch: box('.match-pitch'), bench: box('.bench-grid') }
  })
}

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`fixed pitch and 4 equal bench columns at ${viewport.width}x${viewport.height}`, async ({ page, context, request }, testInfo) => {
    await page.setViewportSize(viewport)
    const id = `test-${crypto.randomUUID()}`
    await seed(request, id, withBench())
    await prepare(context, id)
    await openMatch(page)
    await synced(page)
    await expect(page.getByRole('button', { name: 'Testlag', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '3-4-1', exact: true })).toHaveCount(0)
    await expect(page.getByText(/Trykk på en spiller på benken/)).toHaveCount(0)
    const before = await geometry(page)
    expect(before.pitch.y).toBeGreaterThanOrEqual(0)
    expect(before.pitch.y + before.pitch.height).toBeLessThanOrEqual(viewport.height)
    expect(before.bench.y + before.bench.height).toBeLessThanOrEqual(viewport.height)
    const buttons = await page.locator('.bench-player').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }))
    expect(buttons).toHaveLength(8)
    expect(new Set(buttons.slice(0, 4).map(button => button.y)).size).toBe(1)
    expect(new Set(buttons.slice(4).map(button => button.y)).size).toBe(1)
    expect(Math.max(...buttons.map(button => button.width)) - Math.min(...buttons.map(button => button.width))).toBeLessThan(1)
    expect(buttons.every(button => button.height === 52)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
    await substitute(page)
    await synced(page)
    expect(await geometry(page)).toEqual(before)
    await page.getByRole('button', { name: 'Byttelogg (1)', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Byttelogg' })).toBeVisible()
    await expect(page.getByText('↓ Inn: #2 Benk', { exact: true })).toBeVisible()
    expect(await geometry(page)).toEqual(before)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Byttelogg (1)', exact: true })).toBeFocused()
    expect(await geometry(page)).toEqual(before)
    await page.screenshot({ path: testInfo.outputPath('compact-matchday.png') })
    await page.getByRole('button', { name: 'Tropp', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Testlag', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '3-4-1', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '3-1-1-3', exact: true }).click()
    await synced(page)
    await page.getByRole('button', { name: 'Kampdag', exact: true }).click()
    await expect(page.locator('.match-pitch')).toBeVisible()
  })
}

test('a large bench scrolls internally and its last player remains usable', async ({ page, context, request }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const id = `test-${crypto.randomUUID()}`
  await seed(request, id, withBench(19))
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  const before = await geometry(page)
  const bench = page.locator('.bench-grid')
  await bench.hover()
  await page.mouse.wheel(0, 500)
  await expect.poll(() => bench.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await page.getByRole('button', { name: '20 Spiller 20, 0 minutter', exact: true }).click()
  await page.getByRole('button', { name: '1 Felt, S', exact: true }).click()
  await synced(page)
  expect((await readCloud(request, id)).positions['3-4-1'].fc).toBe('bench-18')
  expect(await geometry(page)).toEqual(before)
})

test('touch drag uses the resized SVG position and logs exactly one substitution', async ({ browser, request }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true })
  try {
    const id = `test-${crypto.randomUUID()}`
    await seed(request, id)
    await prepare(context, id)
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4185/Ready-Lilla-matchday/')
    await synced(page)
    const bench = await page.getByRole('button', { name: /^2\s*Benk/ }).boundingBox()
    const field = await page.getByRole('button', { name: '1 Felt, S', exact: true }).boundingBox()
    const session = await context.newCDPSession(page)
    const start = { x: bench.x + bench.width / 2, y: bench.y + bench.height / 2 }
    const target = { x: field.x + field.width / 2, y: field.y + field.height / 2 }
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [target] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
    await synced(page)
    expect((await readCloud(request, id)).subLog).toHaveLength(1)
  } finally { await context.close() }
})

test('empty log and reset confirmation are overlays and Escape leaves data unchanged', async ({ page, context, request }) => {
  const id = `test-${crypto.randomUUID()}`
  await seed(request, id)
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  const before = await geometry(page)
  await page.getByRole('button', { name: 'Byttelogg (0)', exact: true }).click()
  await expect(page.getByText('Ingen bytter registrert.')).toBeVisible()
  await page.getByRole('button', { name: 'Lukk byttelogg', exact: true }).click()
  await page.getByRole('button', { name: 'Nullstill…', exact: true }).click()
  await page.getByRole('button', { name: 'Nullstill spilletid', exact: true }).click()
  await expect(page.getByText('Nullstill spilletid og byttelogg?')).toBeVisible()
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true)
  expect(await geometry(page)).toEqual(before)
  await page.keyboard.press('Escape')
  expect((await readCloud(request, id)).fieldStartMinute).toEqual({ field: 0 })
})

test('all formations keep their player-time badges within the resized pitch', async ({ page, context, request }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  const id = `test-${crypto.randomUUID()}`
  const squad = Array.from({ length: 15 }, (_, i) => ({ id: `p-${i}`, number: i + 1, name: `Spiller ${i + 1}` }))
  const positions = Object.fromEntries(Object.entries(FORMATIONS).map(([key, value]) => [key, Object.fromEntries(value.positions.map((position, i) => [position.id, squad[i].id]))]))
  await seed(request, id, {
    ...initialMatch, squad, positions,
    playMinutes: Object.fromEntries(squad.map(player => [player.id, 6])),
    fieldStartMinute: Object.fromEntries(squad.slice(0, 9).map(player => [player.id, 0])),
  })
  await prepare(context, id)
  await openMatch(page)
  await synced(page)
  for (const formation of Object.keys(FORMATIONS)) {
    await page.getByRole('button', { name: 'Tropp', exact: true }).click()
    await page.getByRole('button', { name: formation, exact: true }).click()
    await synced(page)
    await page.getByRole('button', { name: 'Kampdag', exact: true }).click()
    await expect(page.locator('.match-pitch')).toBeVisible()
    await expect.poll(() => page.locator('.match-pitch').evaluate(svg => {
      const { width, height } = svg.viewBox.baseVal
      return [...svg.querySelectorAll('g[role=button]')].every(element => {
        const rect = element.getBBox()
        return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height
      })
    })).toBe(true)
    const buttons = await page.locator('.bench-player').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().y))
    expect(buttons).toHaveLength(6)
    expect(new Set(buttons.slice(0, 4)).size).toBe(1)
    expect(new Set(buttons.slice(4)).size).toBe(1)
  }
})

test('large touch bench supports swipe scrolling and long-press dragging without moving the pitch', async ({ browser, request }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true })
  try {
    const id = `test-${crypto.randomUUID()}`
    await seed(request, id, withBench(19))
    await prepare(context, id)
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4185/Ready-Lilla-matchday/')
    await synced(page)
    const before = await geometry(page)
    const session = await context.newCDPSession(page)
    const region = await page.locator('.bench-grid').boundingBox()
    const x = region.x + region.width / 8
    const y = region.y + region.height - 20
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (const offset of [15, 35, 60]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - offset }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => page.locator('.bench-grid').evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    expect((await readCloud(request, id)).subLog).toEqual([])
    expect(await geometry(page)).toEqual(before)
    await page.locator('.bench-grid').evaluate(element => { element.scrollTop = 0 })
    const bench = await page.getByRole('button', { name: /^2\s*Benk/ }).boundingBox()
    const field = await page.getByRole('button', { name: '1 Felt, S', exact: true }).boundingBox()
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bench.x + bench.width / 2, y: bench.y + bench.height / 2 }] })
    // This delay is the actual long-press gesture, not a wait for application state.
    await page.waitForTimeout(260)
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: field.x + field.width / 2, y: field.y + field.height / 2 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
    await synced(page)
    expect((await readCloud(request, id)).subLog).toHaveLength(1)
    expect(await geometry(page)).toEqual(before)
  } finally { await context.close() }
})
