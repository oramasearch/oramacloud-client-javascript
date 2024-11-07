
## Secure Proxy

## Generating embeddings via the Secure Proxy

```js
import { OramaProxy } from "@oramacloud/secure-proxy";

const proxy = new OramaProxy({
  api_key: "<Your Orama Secure Proxy API Key>",
});

const embeddings = await proxy.generateEmbeddings(
  "red leather shoes",
  "openai/text-embedding-ada-002"
);

console.log(embeddings);
// [-0.019633075, -0.00820422, -0.013555876, -0.011825735, 0.006641511, -0.012948156, ...]
```

Available models:

- `orama/gte-small`. 384 dimensions, operated by Orama Cloud (preferred)
- `orama/gte-medium`. 768 dimensions, operated by Orama Cloud
- `orama/gte-large`. 1024 dimensions, operated by Orama Cloud
- `openai/text-embedding-ada-002`. 1536 dimensions, proxied to OpenAI
- `openai/text-embedding-3-small`. 1536 dimensions, proxied to OpenAI
- `openai/text-embedding-3-large`. 3072 dimensions, proxied to OpenAI

## Generating chat completions via the Secure Proxy

You can generate chat completions via the Secure Proxy in two different ways:

### Returning a single string

```js
import { OramaProxy } from "@oramacloud/secure-proxy";

const proxy = new OramaClient({
  api_key: "<Your Orama Secure Proxy API Key>",
});

const chatParams = {
  model: "openai/gpt-4",
  messages: [{ role: "user", content: "Who is Michael Scott?" }],
};

const response = await proxy.chat(chatParams);
console.log(response);

// "Michael Scott is a fictional character from the television show "The Office" (US version) ..."
```

Available models:

- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/gpt-4-turbo`
- `openai/gpt-4`
- `openai/gpt-3.5-turbo`

### Returning a stream (via async iterators)

```js
import { OramaProxy } from "@oramacloud/secure-proxy";

const proxy = new OramaClient({
  api_key: "<Your Orama Secure Proxy API Key>",
});

const chatParams = {
  model: "openai/gpt-4",
  messages: [{ role: "user", content: "Who is Michael Scott?" }],
};

for await (const message of proxy.chatStream(chatParams)) {
  console.log(message);
}

// Michael
// Scott is
// a fictional
//  character from the
//  television show
// "The
// Office" (US
// version)
// ...
```

Available models:

- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/gpt-4-turbo`
- `openai/gpt-4`
- `openai/gpt-3.5-turbo`