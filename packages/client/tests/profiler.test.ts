import assert from 'node:assert'
import type { AddressInfo } from 'node:net'
import t from 'node:test'
import fFormBody from '@fastify/formbody'
import Fastify from 'fastify'
import { LOCAL_STORAGE_USER_ID_KEY } from '../src/constants.js'
import { OramaClient } from '../src/index.js'

class MockedLocalStorage {
  storage: Record<string, string> = {}
  length = 0

  getItem(key: string): string | null {
    return this.storage[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.storage[key] = value
    this.length = Object.keys(this.storage).length
  }

  removeItem(key: string): void {
    delete this.storage[key]
    this.length = Object.keys(this.storage).length
  }

  clear(): void {
    this.storage = {}
    this.length = 0
  }

  key(index: number): string | null {
    return Object.keys(this.storage)[index] ?? null
  }
}

await t.test('profiler', async (t) => {
  const { port } = await setUpServer(t)

  const endpoint = `http://localhost:${port}/index/my-index`
  const apiKey = 'my-api-key'

  await t.test('should generate a user id, when client is created in Server Side', (t) => {
    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const userId = client.getUserId()

    assert.notEqual(userId, undefined)
    assert.equal(typeof userId, 'string')
  })

  await t.test('should generate a user id, when client is created in Client Side', async (t) => {
    globalThis.localStorage = new MockedLocalStorage() as Storage // Client Side only

    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const userId = client.getUserId()

    assert.notEqual(userId, undefined)
    assert.equal(typeof userId, 'string')
    assert.equal(userId, globalThis.localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY))
  })

  await t.test('should use the persisted a user id, when client is returning in Client Side', async (t) => {
    globalThis.localStorage = new MockedLocalStorage() as Storage // Client Side only

    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const userId = client.getUserId()

    assert.notEqual(userId, undefined)
    assert.equal(typeof userId, 'string')
    assert.equal(userId, globalThis.localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY))

    const client2 = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const userId2 = client2.getUserId()

    assert.equal(userId2, userId)
  })

  await t.test('should call identifier service to identify users', async (t) => {
    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const identity = 'mocked-identity'

    await client.identify(identity)

    const ident = client.getIdentity()
    assert.equal(ident, identity)
  })

  await t.test('should call identifier service to set alias to user', async (t) => {
    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const alias = 'mocked-alias'

    await client.alias(alias)

    const ident = client.getAlias()
    assert.equal(ident, alias)
  })

  await t.test('should reset the user id', async (t) => {
    const client = new OramaClient({
      endpoint,
      api_key: apiKey
    })

    const identity = 'mocked-identity'

    await client.identify(identity)

    const oldUserId = client.getUserId()

    assert.equal(client.getIdentity(), identity)

    client.reset()

    const newUserId = client.getUserId()

    assert.equal(client.getIdentity(), undefined)
    assert.notEqual(oldUserId, newUserId)
  })
})

async function setUpServer(t: any): Promise<{
  port: number
}> {
  const fastify = Fastify()

  await fastify.register(fFormBody)
  fastify.get('/index/my-index/init', async (request, reply) => {
    return {
      collectUrl: `http://localhost:${port}/collect`,
      deploymentID: 'the-deployment-id',
      index: 'my-index'
    }
  })

  fastify.get('/identify', async (request, reply) => {
    return {
      status: 'ok'
    }
  })

  await fastify.listen()
  t.after(async () => {
    // Hack to ensure that the server is not closed
    // before the test ends
    await new Promise((resolve) =>
      setTimeout(() => {
        fastify.close()
        resolve(null)
      }, 1000)
    )
  })
  const port = (fastify.server.address() as AddressInfo).port

  return {
    port
  }
}
