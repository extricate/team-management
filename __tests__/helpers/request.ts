export function makeRequest(
  path: string,
  options: {
    method?: string
    body?: unknown
    searchParams?: Record<string, string>
  } = {}
): Request {
  const url = new URL(`http://localhost${path}`)
  if (options.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v)
    }
  }
  return new Request(url.toString(), {
    method: options.method ?? 'GET',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
}
