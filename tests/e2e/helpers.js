import { expect } from '@playwright/test'

const project = 'demo-kampstotte'
const origin = 'http://127.0.0.1:8085'

function documentUrl(collection, id) {
  if (!['teams', 'clock'].includes(collection) || !/^test-[a-z0-9-]+$/.test(id)) {
    throw new Error('Only isolated test documents are allowed')
  }
  return `${origin}/v1/projects/${project}/databases/(default)/documents/${collection}/${id}`
}

function encode(value) {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } }
}

function decode(value) {
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode)
  return Object.fromEntries(Object.entries(value.mapValue?.fields ?? {}).map(([key, item]) => [key, decode(item)]))
}

export const initialMatch = {
  squad: [{ id: 'field', number: 1, name: 'Felt' }, { id: 'bench', number: 2, name: 'Benk' }],
  formation: '3-4-1', positions: { '3-4-1': { fc: 'field' } },
  playMinutes: {}, fieldStartMinute: { field: 0 }, subLog: [],
}

// Emulator-only REST seeding uses its owner bypass, never production credentials.
export async function seed(request, id, data = initialMatch) {
  const team = await request.patch(documentUrl('teams', id), {
    headers: { Authorization: 'Bearer owner' },
    data: { fields: encode(data).mapValue.fields },
  })
  expect(team.ok(), await team.text()).toBeTruthy()
  const clock = await request.patch(documentUrl('clock', id), {
    headers: { Authorization: 'Bearer owner' },
    data: { fields: encode({ running: false, virtualStart: null, elapsed: 120 }).mapValue.fields },
  })
  expect(clock.ok()).toBeTruthy()
}

export async function readCloud(request, id, collection = 'teams') {
  const response = await request.get(documentUrl(collection, id), { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBeTruthy()
  return decode({ mapValue: { fields: (await response.json()).fields } })
}

export async function prepare(context, id, localData = null) {
  const external = []
  // Firestore may ATTEMPT a Google connectivity-probe image on network loss.
  // Block every external request and assert no external response was received.
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort('blockedbyclient')
  })
  context.on('response', response => {
    const url = new URL(response.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) external.push(url.href)
  })
  await context.addInitScript(({ id, localData }) => {
    // Initialize once per context, not again after a reload or reopening.
    if (localStorage.getItem('e2e-prepared')) return
    localStorage.setItem('e2e-prepared', 'true')
    localStorage.setItem('kampstotte_teams', JSON.stringify([{ id, name: 'Testlag', color: 'purple' }]))
    if (localData) {
      for (const [key, value] of Object.entries(localData)) localStorage.setItem(`kampstotte_${id}_${key}`, key === 'formation' ? value : JSON.stringify(value))
    }
  }, { id, localData })
  return external
}

export async function openMatch(page) {
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Testlag', exact: true })).toBeVisible()
}

export async function synced(page) {
  await expect(page.getByRole('status')).toHaveText('Synkronisert med skyen')
}

export async function substitute(page, reverse = false) {
  const bench = page.getByRole('button', { name: /^2\s*Benk/ })
  const field = page.getByRole('button', { name: '1 Felt, S', exact: true })
  if (reverse) { await field.click(); await bench.click() }
  else { await bench.click(); await field.click() }
  await expect(page.getByRole('button', { name: '2 Benk, S', exact: true })).toBeVisible()
}

export async function pending(page, id, collection = 'teams') {
  return page.evaluate(({ id, collection }) => {
    const entry = JSON.parse(localStorage.getItem(`kampstotte_pending_${collection}/${id}`))
    return entry?.pending === false ? null : entry
  }, { id, collection })
}
