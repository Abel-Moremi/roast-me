# Roast-Me Function Structure

```
functions/
├── main.py                 # Entry point - Cloud Function handler
├── config.py              # Configuration and constants
├── requirements.txt       # Python dependencies
├── .gcloudignore         # GCloud deployment ignore rules
├── services/             # Business logic layer
│   ├── __init__.py
│   ├── roast_service.py  # Roast generation with Gemini Vision
│   └── tts_service.py    # Text-to-speech audio generation
├── utils/                # Utility functions
│   ├── __init__.py
│   ├── image_utils.py    # Image processing helpers
│   └── decode_audio.py   # Audio decoding utility (for testing)
└── temp/                 # Test audio files (gitignored)
    └── .gitignore
```

## Module Responsibilities

### `main.py`
- HTTP request handling
- CORS management
- Request orchestration
- Error handling and response formatting

### `config.py`
- Environment variables
- Model configurations
- Constants and schemas
- CORS headers

### `services/roast_service.py`
- Gemini Vision API integration
- Roast data generation
- Response parsing and validation
- Narration text formatting

### `services/tts_service.py`
- Gemini TTS API integration
- Audio generation
- Base64 encoding
- Test file generation (development only)

### `utils/image_utils.py`
- Image parsing (base64/multipart)
- Image resizing
- Format conversion

### `utils/decode_audio.py`
- PCM to WAV conversion
- WAV header generation
- Testing utility (local development)

## Design Principles

✅ **Separation of Concerns** - Each module has a single, well-defined purpose
✅ **Modularity** - Easy to test, extend, and maintain
✅ **Clean Architecture** - Business logic separated from infrastructure
✅ **Configuration Management** - Centralized settings
✅ **Error Handling** - Consistent error patterns throughout
