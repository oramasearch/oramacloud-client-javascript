# Orama Cloud Ract Client

```jsx
import { OramaCloud, useSearch } from "@oramacloud/client/react";

export function App() {
  return (
    <OramaCloud
      endpoint="<Your Orama Cloud Endpoint>"
      apiKey="<Your Orama Cloud API Key>"
    >
      <Search />
    </OramaCloud>
  );
}

function Search() {
  const { results, error } = useSearch({
    term: "red leather shoes",
    limit: 10,
    offset: 5,
  });

  return (
    <>
      {results.hits.map((hit) => {
        <div key={hit.id}>
          <p> {hit.document.myCustomProperty} </p>
        </div>;
      })}
    </>
  );
}
```
