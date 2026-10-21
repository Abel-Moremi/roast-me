import { useMockRoast } from '@/composables/useMockRoast'

/**
 * Sends a photo to the roast Cloud Function.
 *
 * Falls back to the bundled mock response (public/mock/output.txt) when the
 * API URL isn't configured or the request fails, so the app still works in
 * local development.
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
   * @returns {Promise<Object|null>} Roast response, or null if both the API
   *   and the mock data failed
   */
  const requestRoast = async (base64Image) => {
    const apiUrl = getApiUrl()

    if (apiUrl) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        console.error('Roast API request failed, falling back to mock data:', error)
      }
    } else {
      console.log('No API URL configured, using mock data')
    }

    return await loadMockData()
  }

  return { requestRoast }
}
