// Quick test to verify mock file structure
import fs from 'fs'
import path from 'path'

// Read the mock file
const mockPath = path.resolve('./mock/output.txt')
const content = fs.readFileSync(mockPath, 'utf-8')

try {
  const data = JSON.parse(content)
  console.log('✅ JSON parsed successfully')
  console.log('Top-level keys:', Object.keys(data))
  console.log('')
  
  // Check each property
  console.log('animationScript present?', !!data.animationScript)
  if (data.animationScript) {
    console.log('  - animationScript.timeline present?', !!data.animationScript.timeline)
    console.log('  - timeline frame count:', data.animationScript.timeline?.length)
  }
  
  console.log('audio present?', !!data.audio)
  console.log('  - audio type:', typeof data.audio)
  if (typeof data.audio === 'string') {
    console.log('  - audio length:', data.audio.length)
  }
  
  console.log('audioMimeType present?', !!data.audioMimeType)
  console.log('data present?', !!data.data)
  console.log('success present?', !!data.success)
  
} catch (error) {
  console.error('❌ JSON parse error:', error.message)
}
