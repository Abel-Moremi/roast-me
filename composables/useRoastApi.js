import { useMockRoast } from '@/composables/useMockRoast'

/**
 * Sends a photo to the roast Cloud Function.
 *
 * Falls back to the bundled mock response (public/mock/output.txt) when the
 * API URL isn't configured or the request fails, so the app still works in
 * local development. The result says which one was used so the UI can tell
 * the user they're seeing a sample roast.
 */
export const useRoastApi = () => {
  const { loadMockData } = useMockRoast()

  const getApiUrl = () => {
    const url = (import.meta.env.VITE_ROAST_API_URL || '').trim()
    // Ignore unset values and the "your-..." placeholder from the example env
    if (!url || url.includes('your-')) return null
    return url
  }

  /**
   * @param {string} base64Image - Data URL of the captured photo
   * @returns {Promise<{ data: Object|null, source: 'api'|'mock', reason?: 'not-configured'|'api-failed' }>}
   *   `data` is null only if both the API and the mock data failed
   */
  const requestRoast = async (base64Image) => {
    const apiUrl = getApiUrl()
    let reason = 'not-configured'

    if (apiUrl) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        })

        // 4xx responses carry a message meant for the user (bad image,
        // blocked by safety filters), so pass them through rather than
        // covering them up with the mock roast. Only 5xx falls back.
        const isClientError = response.status >= 400 && response.status < 500
        if (!response.ok && !isClientError) {
          throw new Error(`API error: ${response.status}`)
        }

        return { data: await response.json(), source: 'api' }
      } catch (error) {
        console.error('Roast API request failed, falling back to mock data:', error)
        reason = 'api-failed'
      }
    } else {
      console.log('No API URL configured, using mock data')
    }

    return { data: await loadMockData(), source: 'mock', reason }
  }

  return { requestRoast }
}
