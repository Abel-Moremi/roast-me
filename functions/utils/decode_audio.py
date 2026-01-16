"""
Script to decode base64 audio to WAV file with proper headers
"""
import base64
import sys
import os
import struct


def create_wav_header(data_size, sample_rate=24000, num_channels=1, bits_per_sample=16):
    """Create a WAV file header for PCM audio."""
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    
    header = struct.pack('<4sI4s', b'RIFF', 36 + data_size, b'WAVE')
    header += struct.pack('<4sIHHIIHH', b'fmt ', 16, 1, num_channels, sample_rate, 
                          byte_rate, block_align, bits_per_sample)
    header += struct.pack('<4sI', b'data', data_size)
    
    return header


def decode_audio(base64_file="audio_base64.txt", output_file="roast_audio.wav"):
    """Decode base64 audio to WAV file with proper headers."""
    
    # Check if file exists
    if not os.path.exists(base64_file):
        print(f"Error: {base64_file} not found!")
        return False
    
    # Read base64 string
    print(f"Reading base64 data from {base64_file}...")
    with open(base64_file, "r") as f:
        base64_audio = f.read().strip()
    
    # Decode base64 to bytes
    print("Decoding base64 to audio bytes...")
    try:
        pcm_data = base64.b64decode(base64_audio)
    except Exception as e:
        print(f"Error: Failed to decode base64 data! {e}")
        return False
    
    print(f"PCM data size: {len(pcm_data)} bytes")
    
    # Add WAV header to PCM data
    print("Adding WAV header to PCM data...")
    wav_header = create_wav_header(len(pcm_data))
    wav_data = wav_header + pcm_data
    
    # Save as WAV file
    print(f"Saving audio to {output_file}...")
    with open(output_file, "wb") as f:
        f.write(wav_data)
    
    print(f"Success! Audio saved to {output_file}")
    print(f"Total file size: {len(wav_data)} bytes (header + PCM data)")
    return True


if __name__ == "__main__":
    base64_file = sys.argv[1] if len(sys.argv) > 1 else "audio_base64.txt"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "roast_audio.wav"
    
    success = decode_audio(base64_file, output_file)
    sys.exit(0 if success else 1)
