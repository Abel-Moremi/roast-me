---
tags: [character, assets]
---
# comedian.glb

`public/comedian.glb`: about **29 MB**, loaded on every visit (the biggest part of load time). These facts were read from the file's glTF header.

## Contents
- **One skinned mesh:** `Cesar_D_LaTorre_Jacket`, with **121 face shapes**.
- **Skeleton:** 1 skin, 101 joints, with Character Creator / ActorCore names (`CC_Base_Head`, `CC_Base_Spine02`, `CC_Base_L_Upperarm`, …). `BONE_MAP` in `composables/animation/animationConstants.js` maps short names to these for the procedural idle sway.
- **12 animation clips:**

| Clip | Used by the backend? | Notes |
| --- | --- | --- |
| `idle` | ✅ | standing idle |
| `walk-relaxed-start` | ✅ | plays once |
| `walk-relaxed-loop` | ✅ | |
| `walk-relaxed-end` | ✅ | plays once |
| `stand-to-sit` | ✅ | plays once |
| `spellcast` | ✅ | |
| `aerobic-dance` | ✅ | |
| `relax` | ✅ | also the pose on load |
| `walk-think` | ✅ | |
| `sit-talk` | frontend only | seated idle after `stand-to-sit` |
| `Action` | no | reachable as console state `action` |
| `Default` | no | reachable as console state `default` |

Full mapping: [[Animation Catalogue]].

## Face shape families
| Prefix / name | Examples | Used for |
| --- | --- | --- |
| `V_*` | `V_Open`, `V_Explosive`, `V_Wide`, `V_Lip_Open` | showing the teeth while talking ([[Face & Lip Sync]]) |
| Descriptive names | `Brow_Raise_Left`, `Eye_Wide_L`, `Mouth_Smile`, `Mouth_Frown_L`, `Nose_Scrunch`, `Cheek_Raise_L`, `Mouth_Open` | lips (`Mouth_*`), blinking (`Eye_Blink_*`) |
| `A01`–`A51` (ARKit-style) | `A01_Brow_Inner_Up`, `A25_Jaw_Open`, `A38_Mouth_Smile_Left` | jaw (`A25_Jaw_Open`), blinking |
| `T10`/`T11` | `T10_Tongue_Bulge_Left` | unused |

To list everything again (from the repo root):
```bash
node -e "const b=require('fs').readFileSync('public/comedian.glb');const j=JSON.parse(b.slice(20,20+b.readUInt32LE(12)));console.log(j.animations.map(a=>a.name));console.log(j.meshes.map(m=>m.extras&&m.extras.targetNames))"
```

## Replacing the model
Anything that relies on names has to be checked again:
- clip names → `ANIMATION_STATES` (frontend) and `AVAILABLE_ANIMATIONS` (backend)
- bone names → `BONE_MAP`
- face shape names → `useBlinking`, `useJawMovement`, `useMouthAnimation`, `expressionConfigs`
- position and scale → `COMEDIAN_SCALE` / `COMEDIAN_POSITION_Z` in `ComedyClubScene.vue`
- the backend's clip durations in `AVAILABLE_ANIMATIONS` (`duration`), which are only given to Gemini as guidance
