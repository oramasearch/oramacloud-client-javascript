import type { SummaryParams } from '../src/proxy.js'

import t from 'node:test'
import assert from 'node:assert'
import { OramaProxy } from '../src/proxy.js'
import { OramaClient } from '../src/client.js'
import { CloudManager } from '../src/manager/index.js'
import 'dotenv/config.js'
import { Interaction } from '../src/answerSession.js'

function createProxy() {
  return new OramaProxy({
    api_key: process.env.ORAMA_SECURE_PROXY_API_KEY_TEST || ''
  })
}

await t.test('secure proxy', async t => {

  await t.test('summaryStream should abort previous requests', async t => {
    const client = createProxy();

    const summaryStreamFirst = client.summaryStream({
      docIDs: ['3', '1', '2'],
      indexID: 'e2e-test-01',
      model: 'openai/gpt-4o-mini',
      prompt: 'Initial request'
    });

    const firstResponse = await summaryStreamFirst.next();
    assert.ok(!firstResponse.done && firstResponse.value, 'First request should yield data');

    const summaryStreamSecond = client.summaryStream({
      docIDs: ['4', '5', '6'],
      indexID: 'e2e-test-02',
      model: 'openai/gpt-4o-mini',
      prompt: 'Subsequent request'
    });

    // await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the second stream to potentially yield data

    const secondResponse = await summaryStreamSecond.next();
    assert.ok(!secondResponse.done && secondResponse.value, 'Second request should yield data');

    const nextFirstResponse = await summaryStreamFirst.next();
    assert.ok(nextFirstResponse.done, 'First stream should be canceled');
  });

  await t.test('can generate summaries', async t => {
    const client = createProxy();

    const summaryParams: SummaryParams = {
      docIDs: ['3', '1', '2'],
      indexID: 'e2e-test-01',
      deploymentID: 'e2e-test-01',
      model: 'openai/gpt-4o-mini',
      prompt: 'Who is michael scott?'
    }

    const summary = await client.summary(summaryParams)

    assert.ok(summary.length > 0)

  })

  await t.test('can generate openai embeddings', async t => {
    const client = createProxy();

    const embeddings = await client.generateEmbeddings('hello world', 'openai/text-embedding-ada-002')
    assert.equal(embeddings.length, 1536)
  })

  await t.test('can stream chat responses via gpt-4o', async t => {
    const client = createProxy();

    const resp = client.chatStream({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Who is Michael Scott?' }]
    })

    for await (const message of resp) {
      assert.ok(message.length > 0)
    }
  })

  await t.test('can stream chat wait for /init', async t => {
    const client = createProxy()

    const resp = client.chatStream({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'Who is Michael Scott?' }]
    })

    for await (const message of resp) {
      assert.ok(message.length > 0)
    }
  })
})

await t.test('answer session', async t => {

  if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY) {
    t.skip('ORAMA_E2E_ENDPOINT and ORAMA_E2E_API_KEY are not set. E2e tests will be skipped.')
    return
  }

  const client = new OramaClient({
    endpoint: process.env.ORAMA_E2E_ENDPOINT!,
    api_key: process.env.ORAMA_E2E_API_KEY!
  })

  await t.test('can create an answer session', async t => {
    const session = client.createAnswerSession()

    const answer = await session.ask({
      term: 'german'
    })
    assert.ok(answer.length > 0)
  })
})

await t.test('answer session - related queries', async t => {

  if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY) {
    t.skip('ORAMA_E2E_ENDPOINT and ORAMA_E2E_API_KEY are not set. E2e tests will be skipped.')
    return
  }

  const client = new OramaClient({
    endpoint: process.env.ORAMA_E2E_ENDPOINT!,
    api_key: process.env.ORAMA_E2E_API_KEY!
  })

  await t.test('can get related queries', async t => {
    const session = client.createAnswerSession({
      events: {
        onRelatedQueries: (queries) => {
          assert.ok(queries.length === 3)
        }
      }
    })

    await session.ask({
      term: 'german',
      related: {
        howMany: 3,
        format: 'query',
      }
    })
  })
})

await t.test('can use the manager APIs', async t => {
  if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY || !process.env.ORAMA_E2E_PRIVATE_API_KEY || !process.env.ORAMA_E2E_INDEX_ID) {
    t.skip('One or more of ORAMA_E2E_ENDPOINT, ORAMA_E2E_API_KEY, ORAMA_E2E_PRIVATE_API_KEY, ORAMA_E2E_INDEX_ID are not set. E2e tests will be skipped.')
    return
  }

  const manager = new CloudManager({
    api_key: process.env.ORAMA_E2E_PRIVATE_API_KEY!
  })

  const indexManager = manager.index(process.env.ORAMA_E2E_INDEX_ID)

  await t.test('should be able to empty the index', async t => {
    const isEmpty = await indexManager.empty()
    assert.ok(isEmpty)
  })

  await t.test('should be able to insert some data', async t => {
    const success = await indexManager.insert([
      {
        id: '1',
        breed: "Orama Retriever",
        country: "Italy",
        longevity: 100,
        character: [
          "Easy to use",
          "Fast",
        ],
        colors: {
          fur: [],
          eyes: []
        }
      },
      {
        id: '2',
        breed: "To be removed",
        country: "Italy",
        longevity: 100,
        character: [],
        colors: {
          fur: [],
          eyes: []
        }
      }
    ])
    assert.ok(success)
  })

  await t.test('should be able to remove some data', async t => {
    const success = await indexManager.delete([
      {
        id: '2'
      }
    ])
    assert.ok(success)
  })

  await t.test('should be able to deploy the index', async t => {
    const success = await indexManager.deploy()
    assert.ok(success)
  })
})

await t.test('state management via answer session APIs', async t => {
  if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY) {
    t.skip('ORAMA_E2E_ENDPOINT and ORAMA_E2E_API_KEY are not set. E2e tests will be skipped.')
    return
  }

  const client = new OramaClient({
    endpoint: process.env.ORAMA_E2E_ENDPOINT!,
    api_key: process.env.ORAMA_E2E_API_KEY!
  })

  await t.test('onStateChange', async t => {
    let state: Interaction[] = []

    const session = client.createAnswerSession({
      events: {
        onStateChange: (incomingState) => {
          state = incomingState
        }
      }
    })

    await session.ask({
      term: 'german',
      related: {
        format: 'query',
        howMany: 3
      }
    })

    await session.ask({
      term: 'labrador',
      related: {
        format: 'query',
        howMany: 3
      }
    })

    assert.equal(state.length, 2)
    assert.equal(state[0].query, 'german')
    assert.equal(state[1].query, 'labrador')
    assert.equal(state[0].aborted, false)
  })

  await t.test('aborting before .ask resolution', async t => {
    let externalState: Interaction[] = []

    const session = client.createAnswerSession({
      events: {
        onStateChange: (incomingState) => {
          externalState = incomingState
        }
      },
    })

    session.ask({
      term: 'german',
      related: {
        format: 'query',
        howMany: 3
      }
    })

    // Next diggest
    setTimeout(() => {
      session.abortAnswer()

      assert.equal(externalState.length, 1)
      assert.equal(externalState[0].query, "german")
      assert.equal(externalState[0].aborted, true)
      assert.equal(externalState[0].error, false)
    });
  })
})

await t.test('regenerate last answer', async t => {
  if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY) {
    t.skip('ORAMA_E2E_ENDPOINT and ORAMA_E2E_API_KEY are not set. E2e tests will be skipped.')
    return
  }

  const client = new OramaClient({
    endpoint: process.env.ORAMA_E2E_ENDPOINT!,
    api_key: process.env.ORAMA_E2E_API_KEY!
  })

  let state: Interaction[] = []

  const answerSession = client.createAnswerSession({
    events: {
      onStateChange: (newState) => {
        state = newState
      }
    }
  })

  await answerSession.ask({
    term: 'german'
  })

  await answerSession.ask({
    term: 'labrador'
  })

  await answerSession.regenerateLast({ stream: false })

  assert.equal(state.length, 2)
  assert.equal(state[state.length - 1].query, 'labrador')
})

t.test('can use custom system prompts', async t => {
  if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY) {
    if (!process.env.ORAMA_E2E_ENDPOINT || !process.env.ORAMA_E2E_API_KEY) {
      t.skip('ORAMA_E2E_ENDPOINT and ORAMA_E2E_API_KEY are not set. E2e tests will be skipped.')
      return
    }
  }
  
  const client = new OramaClient({
    endpoint: process.env.ORAMA_E2E_ENDPOINT!,
    api_key: process.env.ORAMA_E2E_API_KEY!
  })

  const session = client
    .createAnswerSession({
      systemPrompts: ['sp_italian-prompt-chc4o0']
    })

  session.setSystemPromptConfiguration({
    systemPrompts: ['sp_italian-prompt-chc4o0']
  })

  const res = await session.ask({
    term: 'what is Orama?'
  })

  assert.ok(res)
})