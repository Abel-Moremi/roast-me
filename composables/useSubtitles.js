import { ref, computed } from 'vue'

// Extra "characters" of time given to each line for the pause between
// sentences, so short lines don't flash past
const PAUSE_WEIGHT = 12
const STORAGE_KEY = 'roastme.subtitles'

/**
 * Split the narration into the pieces the backend speaks, in order. Must
 * match build_narration_text() in functions/services/roast_service.py.
 */
function narrationSegments(roast) {
  if (!roast) return []
  const segments = []
  if (roast.overall_vibe) segments.push(roast.overall_vibe)
  for (const line of roast.roast_lines || []) {
    if (line) segments.push(line)
  }
  if (roast.one_liner) segments.push(`And here's the best part: ${roast.one_liner}`)
  return segments
}

/**
 * Spread the segments over the audio by text length. The response has no
 * per-line timing, so this is an estimate: close enough for subtitles, but
 * it can drift a little when the voice speeds up or pauses.
 *
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
export function buildSubtitleCues(roast, totalDuration) {
  const segments = narrationSegments(roast)
  if (!segments.length || !(totalDuration > 0)) return []

  const weights = segments.map(text => text.length + PAUSE_WEIGHT)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  let start = 0
  return segments.map((text, i) => {
    const end = start + (weights[i] / totalWeight) * totalDuration
    const cue = { start, end, text }
    start = end
    return cue
  })
}

/**
 * Subtitles for the roast being played.
 *
 * @param {Ref<Object|null>} roastData - the full API response
 * @param {Ref<number>} currentTime - playback position in seconds
 * @param {Ref<number>} duration - audio length in seconds (0 until known)
 */
export function useSubtitles(roastData, currentTime, duration) {
  const showSubtitles = ref(readPreference())

  const cues = computed(() => buildSubtitleCues(roastData.value?.data, duration.value))

  const currentSubtitle = computed(() => {
    const t = currentTime.value
    if (t <= 0) return null
    const cue = cues.value.find(c => t >= c.start && t < c.end)
    return cue ? cue.text : null
  })

  function toggleSubtitles() {
    showSubtitles.value = !showSubtitles.value
    try {
      localStorage.setItem(STORAGE_KEY, showSubtitles.value ? 'on' : 'off')
    } catch {
      // Storage blocked (private mode): the choice just isn't remembered
    }
  }

  return { showSubtitles, currentSubtitle, toggleSubtitles }
}

function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}
