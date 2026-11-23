import { loadChapters } from './loadChapters.ts'

const BASE = 'http://x/chapters/'

const chapter = (id: string, ids: string[]) =>
  JSON.stringify({ id, title: `Titel ${id}`, entries: ids.map((i) => ({ id: i, fr: ['a'], nl: ['b'] })) })

function fakeFetch(files: Record<string, string | Error>) {
  const calls: Array<[string, RequestInit | undefined]> = []
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    calls.push([u, init])
    const body = files[u.replace(BASE, '')]
    if (body === undefined) return new Response('nope', { status: 404 })
    if (body instanceof Error) throw body
    return new Response(body, { status: 200 })
  }) as typeof fetch
  return { fn, calls }
}

const list = (names: string[]) => JSON.stringify({ chapters: names })

test('loads listed chapters in list order with cache no-cache', async () => {
  const { fn, calls } = fakeFetch({
    'index.json': list(['ch02.json', 'ch01.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': chapter('ch02', ['ch02-001']),
  })
  const r = await loadChapters(BASE, fn)
  expect(r.status).toBe('ok')
  if (r.status !== 'ok') return
  expect(r.chapters.map((c) => c.id)).toEqual(['ch02', 'ch01'])
  expect(r.failed).toEqual([])
  expect(calls).toHaveLength(3)
  for (const [, init] of calls) expect(init).toEqual({ cache: 'no-cache' })
})

test('ignores files that are not listed', async () => {
  const { fn, calls } = fakeFetch({
    'index.json': list(['ch01.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': chapter('ch02', ['ch02-001']),
  })
  const r = await loadChapters(BASE, fn)
  expect(r.status === 'ok' && r.chapters.map((c) => c.id)).toEqual(['ch01'])
  expect(calls.map(([u]) => u)).not.toContain(BASE + 'ch02.json')
})

test('a missing chapter (404) is skipped and reported', async () => {
  const { fn } = fakeFetch({
    'index.json': list(['ch01.json', 'ch02.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
  })
  const r = await loadChapters(BASE, fn)
  expect(r).toMatchObject({ status: 'ok', failed: ['ch02.json'] })
  expect(r.status === 'ok' && r.chapters.map((c) => c.id)).toEqual(['ch01'])
})

test('a chapter with invalid JSON (trailing comma) is skipped and reported', async () => {
  const { fn } = fakeFetch({
    'index.json': list(['ch01.json', 'ch02.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': '{ "id": "ch02", "entries": [], }',
  })
  const r = await loadChapters(BASE, fn)
  expect(r).toMatchObject({ status: 'ok', failed: ['ch02.json'] })
})

test('a network error is skipped and reported', async () => {
  const { fn } = fakeFetch({
    'index.json': list(['ch01.json', 'ch02.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': new TypeError('offline'),
  })
  const r = await loadChapters(BASE, fn)
  expect(r).toMatchObject({ status: 'ok', failed: ['ch02.json'] })
})

test('a chapter whose id does not match its file name is skipped', async () => {
  const { fn } = fakeFetch({
    'index.json': list(['ch01.json', 'ch02.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': chapter('ch05', ['ch05-001']),
  })
  const r = await loadChapters(BASE, fn)
  expect(r).toMatchObject({ status: 'ok', failed: ['ch02.json'] })
  expect(r.status === 'ok' && r.chapters.map((c) => c.id)).toEqual(['ch01'])
})

test('a later chapter reusing an entry id of an earlier chapter is skipped', async () => {
  const { fn } = fakeFetch({
    'index.json': list(['ch01.json', 'ch02.json']),
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': chapter('ch02', ['ch02-001', 'ch01-001']),
  })
  const r = await loadChapters(BASE, fn)
  expect(r).toMatchObject({ status: 'ok', failed: ['ch02.json'] })
  expect(r.status === 'ok' && r.chapters.map((c) => c.id)).toEqual(['ch01'])
})

test('the list failing gives status error', async () => {
  expect(await loadChapters(BASE, fakeFetch({}).fn)).toEqual({ status: 'error' })
  expect(await loadChapters(BASE, fakeFetch({ 'index.json': '{ nope' }).fn)).toEqual({ status: 'error' })
  expect(await loadChapters(BASE, fakeFetch({ 'index.json': '{"chapters":"x"}' }).fn)).toEqual({ status: 'error' })
})

test('no chapter loading gives status error', async () => {
  const { fn } = fakeFetch({ 'index.json': list(['ch01.json']) })
  expect(await loadChapters(BASE, fn)).toEqual({ status: 'error' })
})
