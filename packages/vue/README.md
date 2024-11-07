# Orama Cloud Vue Client

Import the composable into your component and it's ready to use.

```jsx
<template>
  <li v-for="hit in results?.hits" :key="hit.id">
    {{ hit.id }}
  </li>
</template>

<script setup>
import { useSearch } from "@oramacloud/vue";
import { orama } from './orama'

const { results } = useSearch({
  cloudConfig: {
    apiKey: "<Your Orama Cloud API Key>",
    endpoint: "<Your Orama Cloud Endpoint>",
  },
  term: "guitar",
  limit: 5
});
</script>
```
