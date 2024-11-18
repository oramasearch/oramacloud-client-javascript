# Orama Cloud Client

[![Node.js CI](https://github.com/askorama/javascript-sdk/actions/workflows/node.js.yml/badge.svg)](https://github.com/askorama/javascript-sdk/actions/workflows/node.js.yml)

## Install

```sh
npm i @oramacloud/client
```

## Integrating with Orama Cloud

```js
import { OramaClient } from "@oramacloud/client";

const client = new OramaClient({
  endpoint: "<Your Orama Cloud Endpoint>",
  api_key: "<Your Orama Cloud API Key>",
});

const results = await client.search({
  term: "red leather shoes",
});
```

## Advanced search

```js
const results = await client.search({
  term: "red leather shoes",
  where: {
    price: {
      lte: 9.99,
    },
    gender: "unisex",
  },
  limit: 5,
  offset: 1,
});
```

## Identifying users

### Usage with browsers

1. Call the `.identify()` method with the user's unique identifier.
2. Call `.reset()` when users log out.

Note: we suggest developers to always call `.identify()` when users sign-up, log-in or when the user re-opens the application in a logged-in state.

Example or already logged in state:

```js

import { OramaClient } from "@oramacloud/client";

const client = new OramaClient({
  endpoint: "<Your Orama Cloud Endpoint>",
  api_key: "<Your Orama Cloud API Key>",
});

client.identify("<Your unique User ID>");

client.search({
  term: "red leather shoes",
});
```

Upon logging out:

```js
client.reset();
```

### Usage with server-side applications

1. Call the `.identify()` method with the user's unique identifier.
2. Call `.reset()` when users log out.

OramaClient will always generate a new userId upon **initialization**, so we suggest developers to call the `.reset()` function even when users are not necessarily identified. This will ensure that the client is not associated with the previous user, thus preventing improper data association between sessions.

### Usage of Alias

Aliases are employed to link multiple identifiers to a single user, enabling the tracking of anonymous users across different sessions. This is particularly beneficial for monitoring users who are not logged in or who access the platform from various devices.

```js
import { OramaClient } from "@oramacloud/client";

const client = new OramaClient({
  endpoint: "<Your Orama Cloud Endpoint>",
  api_key: "<Your Orama Cloud API Key>",
});

// Sets the alias for the current user
client.alias("<Unique Alias ID>");

client.search({
  term: "red leather shoes",
});
```

### Related packages

React, vue and secure proxy are now available as separate packages:

* https://www.npmjs.com/package/@oramacloud/react-client

* https://www.npmjs.com/package/@oramacloud/vue-client

* https://www.npmjs.com/package/@oramacloud/secure-proxy