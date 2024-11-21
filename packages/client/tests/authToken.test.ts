import assert from 'node:assert'
import { EventEmitter, once } from 'node:events'
import type { AddressInfo } from 'node:net'
import t from 'node:test'
import fFormBody from '@fastify/formbody'
import Fastify from 'fastify'
import { OramaClient } from '../src/index.js'

await t.test('authToken', async (t) => {
  const { port, telementryWaiter, setInitResponse } = await setUpServer(t)

  const endpoint = `http://localhost:${port}/index/my-index`
  const apiKey = 'my-api-key'

  await t.test('"searchSession" rules the search', async (t) => {
    setInitResponse({
      collectUrl: `http://localhost:${port}/collect`,
      deploymentID: 'the-deployment-id',
      index: 'my-index',
      searchSession: { required: true }
    })
    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })
    const results = await client.search({
      term: 'pippo'
    })
    assert.equal(null, results)

    setInitResponse({
      collectUrl: `http://localhost:${port}/collect`,
      deploymentID: 'the-deployment-id',
      index: 'my-index',
      searchSession: { token: 'the-session-token', maxAge: 100 }
    })
    client.setAuthToken('my-auth-token')
    await client.search({
      term: 'foobar'
    })

    const telemetryBody = await once(telementryWaiter, 'telemetry')

    assert.equal(1, telemetryBody.length)
    assert.equal(telemetryBody[0].events[0].rawSearchString, 'foobar')
  })

  await t.test('When token expires, `onAuthTokenExpired` handler is invoked', async (t) => {
    setInitResponse({
      collectUrl: `http://localhost:${port}/collect`,
      deploymentID: 'the-deployment-id',
      index: 'my-index',
      // token expires in 5 seconds
      searchSession: { token: 'the-session-token', maxAge: 5 }
    })

    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })
    client.setAuthToken('my-auth-token')
    let isOnAuthTokenExpiredInvoked = false
    client.setOnAuthTokenExpired(() => {
      isOnAuthTokenExpiredInvoked = true
      client.setAuthToken('my-auth-token-2')
    })
    const results = await client.search({
      term: 'pippo'
    })
    assert.equal(55, results?.count)

    // When /init will be called again, we provide a new token
    setInitResponse({
      collectUrl: `http://localhost:${port}/collect`,
      deploymentID: 'the-deployment-id',
      index: 'my-index',
      searchSession: { token: 'the-session-token-2', maxAge: 5 }
    })

    // We wait for:
    // - the telementry to check the previous search was sent
    // - the token expiration
    const [telemetryBody] = await Promise.all([once(telementryWaiter, 'telemetry'), new Promise((res) => setTimeout(res, 5500))])
    assert.equal(1, telemetryBody.length)
    assert.equal(telemetryBody[0].events[0].rawSearchString, 'pippo')

    assert.equal(true, isOnAuthTokenExpiredInvoked)

    const resultAfterExpiration = await client.search({
      term: 'foobar'
    })
    assert.equal(55, resultAfterExpiration?.count)
  })
})

async function setUpServer(t: any): Promise<{
  port: number
  telementryWaiter: EventEmitter
  setInitResponse: (res: unknown) => void
}> {
  const fastify = Fastify()
  const telementryWaiter = new EventEmitter()

  await fastify.register(fFormBody)
  let initResponse: unknown
  function setInitResponse(res: unknown) {
    initResponse = res
  }
  fastify.get('/index/my-index/init', async (request, reply) => {
    return initResponse
  })

  fastify.post('/index/my-index/search', async (request, reply) => {
    return {
      hits: [],
      count: 55
    }
  })

  fastify.post('/collect', async (request, reply) => {
    telementryWaiter.emit('telemetry', request.body)
    return {}
  })
  await fastify.listen()
  t.after(async () => await fastify.close())
  const port = (fastify.server.address() as AddressInfo).port

  return {
    port,
    telementryWaiter,
    setInitResponse
  }
}
