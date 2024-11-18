export default function sendBeacon(endpoint: string, body?: string): Promise<Response> | undefined {
  if (typeof navigator !== 'undefined') {
    if (typeof navigator.sendBeacon !== 'undefined') {
      navigator.sendBeacon(endpoint, body)
    }
    return
  }

  fetch(endpoint, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(
    () => {},
    (e) => console.log(e)
  )
}
