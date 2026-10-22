---
tags: [development]
---
# Mock mode

The frontend can run without the backend by playing a saved API response.

## When it kicks in
`composables/useRoastApi.js` → `requestRoast()`:
- `VITE_ROAST_API_URL` is empty, unset or contains `your-` → mock straight away (`reason: 'not-configured'`)
- The request throws (network, CORS) or returns 5xx → mock (`reason: 'api-failed'`)
- **4xx is not mocked:** the API's `{ success: false, error }` is passed through and shown, because it means the photo was rejected, the user was rate-limited, or the API key's quota ran out. For a quota error the user can still choose **Watch a sample roast instead**, which loads the mock (see [[App Shell & State]]).

`requestRoast` returns `{ data, source: 'api' | 'mock', reason }`. `composables/useMockRoast.js` fetches `/mock/output.txt`, i.e. `public/mock/output.txt`. If that fails too, `data` is `null` and `app.vue` shows an error and brings the camera back.

When the mock is used, `app.vue` shows a yellow notice: "Demo mode: this is a sample roast…" or "The roast service is unavailable right now, so here's a sample roast." An outage is visible to users, but it still doesn't raise an alert anywhere. Watch the function's error rate in Cloud Logging.

## The mock file
`public/mock/output.txt` is a full success response in the [[API Contract]] format:
- A real roast (12 lines) and 85.81 s of real TTS audio (~5.5 MB of base64).
- The animation script is the backend's fallback timeline, rebuilt for the real 85.81 s audio length.

To replace it with a fresh response:
```bash
curl -s -X POST "$ROAST_API_URL" -H "Content-Type: application/json" \
  -d @public/mock/input.txt -o public/mock/output.txt
node test_mock_structure.js   # quick shape check
```

`public/mock/input.txt` is a sample request body (`{ "image": "data:image/png;base64,..." }`). Nothing in the app reads it; it's only for testing by hand.
