// Composable to load mock roast data from file
export const useMockRoast = () => {
  const loadMockData = async () => {
    try {
      const response = await fetch('/mock/output.txt')
      if (!response.ok) {
        throw new Error('Failed to load mock data')
      }
      const data = await response.json()
      console.log('📦 useMockRoast.loadMockData() loaded JSON')
      console.log('📦 Top-level keys in loaded data:', Object.keys(data))
      console.log('📦 Has animationScript?', !!data.animationScript)
      console.log('📦 Has audio?', !!data.audio)
      console.log('📦 Audio is string?', typeof data.audio === 'string')
      console.log('📦 Audio length:', typeof data.audio === 'string' ? data.audio.length : 'N/A')
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
