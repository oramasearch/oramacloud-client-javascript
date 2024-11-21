const { OramaClient } = require('@oramacloud/client')

const client = new OramaClient({
  endpoint: '<Your Orama Cloud Endpoint>',
  api_key: '<Your Orama Cloud API Key>'
})

const results = await client.search({
  term: 'red leather shoes'
})

console.log(results)
