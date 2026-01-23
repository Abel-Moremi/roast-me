// Composable to load mock roast data from file
export const useMockRoast = () => {
  const loadMockData = async () => {
    try {
      const response = await fetch('/mock/output.txt')
      if (!response.ok) {
        throw new Error('Failed to load mock data')
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error loading mock data:', error)
      return null
    }
  }

  return {
    loadMockData
  }
}
