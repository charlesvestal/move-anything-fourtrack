# Four Track

A 4-track audio recorder module for Move Anything on Ableton Move.

## Features

- **4 Independent Audio Tracks**: Record up to 60 seconds per track
- **Signal Chain Integration**: Load any Signal Chain patch as your sound source
- **Overdub Recording**: Play back existing tracks while recording new ones
- **Full Mixer**: Per-track level, pan, mute, and solo controls
- **Metronome**: Adjustable tempo with click track
- **Loop Playback**: Loop recorded sections

## Installation

### Build from Source

```bash
./scripts/build.sh      # Builds for ARM64 via Docker
./scripts/install.sh    # Deploys to connected Move
```

### Requirements

- Move Anything installed on Move device
- Docker (for cross-compilation)
- SSH access to Move device

## Usage

1. Select Four Track from the Move Anything menu
2. Load a Signal Chain patch for Track 1
3. Arm Track 1 for recording (Shift + Record)
4. Press Record and play your performance
5. Stop recording and switch to Track 2
6. Load a different patch and record over Track 1
7. Continue layering up to 4 tracks

See [docs/getting-started.md](docs/getting-started.md) for a detailed tutorial.

## Documentation

- [Getting Started Guide](docs/getting-started.md) - Quick tutorial for first-time users
- [User Manual](docs/manual.md) - Complete reference documentation
- [Test Sequence](docs/test-sequence.md) - QA test procedures

## Controls

| Control | Action |
|---------|--------|
| Track Rows | Select track |
| Play | Start/stop playback |
| Record | Start/stop recording |
| Shift+Record | Arm/disarm track |
| Menu | Cycle views (Main/Patch/Mixer) |
| Knobs 1-4 | Track levels |
| Knobs 5-8 | Track pan |
| Left/Right | Adjust tempo |
| Step 1-4 | Mute tracks |
| Shift+Step | Solo tracks |

## Architecture

```
src/
  module.json        # Module metadata
  ui.js              # JavaScript UI (views, controls)
  dsp/
    fourtrack.c      # C DSP plugin (recording, playback, mixing)
    plugin_api_v1.h  # Move Anything plugin API
```

## Technical Specs

- Sample Rate: 44,100 Hz
- Bit Depth: 16-bit stereo
- Default Recording: 120 seconds per track (configurable up to 5 minutes)
- Memory Usage: ~84MB for all 4 tracks at default setting

## License

MIT License - See LICENSE file

## Contributing

Part of the Move Anything project. Contributions welcome!
