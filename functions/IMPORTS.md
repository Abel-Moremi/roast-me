# Import Reference Guide

## Project Structure
```
functions/
├── main.py                    # Entry point
├── config.py                  # Shared configuration
├── services/
│   ├── __init__.py
│   ├── roast_service.py
│   └── tts_service.py
└── utils/
    ├── __init__.py
    ├── image_utils.py
    └── decode_audio.py
```

## Import Patterns

### In `main.py` (root level)
```python
# Direct imports from root
from config import GEMINI_API_KEY, CORS_HEADERS

# Package imports from subfolders
from utils.image_utils import parse_image_from_request, resize_image
from services.roast_service import generate_roast, build_narration_text
from services.tts_service import generate_tts_audio, get_audio_mime_type
```

### In `services/*.py` (service modules)
```python
import sys
import os

# Add parent directory to path (for Cloud Functions)
if __name__ != "__main__":
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

# Import config as module to access all constants
import config

# Use config.CONSTANT_NAME
model = config.VISION_MODEL
temperature = config.ROAST_TEMPERATURE
```

### In `utils/*.py` (utility modules)
```python
# Standard library and third-party imports only
import base64
from io import BytesIO
from PIL import Image

# No config imports needed for pure utilities
```

## Why This Approach?

1. **Cloud Functions Compatibility**: Google Cloud Functions deploy all Python files flat, making relative imports unreliable
2. **Path Independence**: Adding parent directory to sys.path ensures imports work in both local and deployed environments
3. **Module Approach**: Using `import config` instead of `from config import X` makes it clear where constants come from
4. **Cleaner Code**: Reduces circular dependency issues and makes the code more maintainable

## Testing Imports Locally

The import structure should work in both:
- Local development (running main.py directly)
- Cloud Functions deployment (functions_framework)
- Testing (pytest or unittest)

## Common Issues & Solutions

### Issue: "No module named 'config'"
**Solution**: Ensure parent directory is added to sys.path in service modules

### Issue: "ImportError: attempted relative import with no known parent package"
**Solution**: Use absolute imports (not `from ..config`) or add parent to sys.path

### Issue: Imports work locally but fail in Cloud Functions
**Solution**: Use the sys.path approach shown above - it works in both environments
