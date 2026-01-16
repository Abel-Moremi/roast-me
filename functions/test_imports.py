"""
Test script to verify import paths are structured correctly
"""

import sys
import os

# Add functions directory to path
functions_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, functions_dir)

print("Testing import structure...")
print(f"Functions directory: {functions_dir}\n")

# Test directory structure
tests = [
    ("config.py", os.path.join(functions_dir, "config.py")),
    ("main.py", os.path.join(functions_dir, "main.py")),
    ("services/", os.path.join(functions_dir, "services")),
    ("services/__init__.py", os.path.join(functions_dir, "services", "__init__.py")),
    ("services/roast_service.py", os.path.join(functions_dir, "services", "roast_service.py")),
    ("services/tts_service.py", os.path.join(functions_dir, "services", "tts_service.py")),
    ("utils/", os.path.join(functions_dir, "utils")),
    ("utils/__init__.py", os.path.join(functions_dir, "utils", "__init__.py")),
    ("utils/image_utils.py", os.path.join(functions_dir, "utils", "image_utils.py")),
    ("utils/decode_audio.py", os.path.join(functions_dir, "utils", "decode_audio.py")),
]

all_exist = True
for name, path in tests:
    exists = os.path.exists(path)
    status = "✓" if exists else "✗"
    print(f"{status} {name}")
    if not exists:
        all_exist = False

print("\n" + ("="*50))

if all_exist:
    print("✅ All files and directories are in the correct structure!")
    print("\nImport statements should be:")
    print("  main.py:")
    print("    from config import ...")
    print("    from utils.image_utils import ...")
    print("    from services.roast_service import ...")
    print("    from services.tts_service import ...")
    print("\n  services/*.py:")
    print("    from config import ...")
    print("\n  utils/*.py:")
    print("    Standard imports only")
else:
    print("❌ Some files are missing or misplaced!")
    sys.exit(1)
