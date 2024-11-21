export const hasLocalStorage = typeof localStorage !== 'undefined'

type SSESourcePayload = {
  type: 'sources'
  message: object
}

type SSETextStreamPayload = {
  type: 'text'
  message: string
  endOfBlock: boolean
}

type SSEParsedPayload = SSESourcePayload | SSETextStreamPayload

type SSEPayload = {
  data: string
  event: string
}

export function throttle(func: (...args: any[]) => any, limit: number) {
  let inThrottle: boolean
  return function (...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      // biome-ignore lint/suspicious/noAssignInExpressions: saves variable declaration
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function debounce(func: (...args: any[]) => any, delay: number) {
  let debounceTimer: NodeJS.Timeout
  return function (...args: any[]) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func.apply(this, args), delay)
  }
}

export function parseSSE(input: string): SSEPayload {
  const [event, ...data] = input.split('\n')
  const eventData = data.join('\n').replace('data: ', '')

  return {
    event: event.replace('event: ', ''),
    data: eventData
  }
}

export function serializeUserContext(userContext: unknown): string {
  if (typeof userContext === 'object') {
    return JSON.stringify(userContext)
  }

  return `${userContext}`
}
