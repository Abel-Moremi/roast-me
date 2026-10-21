// Loads the bundled mock roast response, used when the real API is unavailable
const MOCK_URL = '/mock/output.txt'

export const useMockRoast = () => {
  const loadMockData = async () => {
    try {
      const response = await fetch(MOCK_URL)
      if (!response.ok) {
        throw new Error(`Failed to load mock data: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error loading mock data:', error)
      return null
    }
  }

  return {
    loadMockData
  }
}
