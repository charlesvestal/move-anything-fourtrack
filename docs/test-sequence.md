# Four Track Recorder - Test Sequence

## Prerequisites

- Move Anything installed on Move device
- Four Track module installed (`./scripts/install.sh`)
- Signal Chain module installed with at least one patch
- MIDI controller or Move pads for input

## Test 1: Module Loading

**Objective:** Verify the module loads correctly.

**Steps:**
1. Power on Move and enter Move Anything
2. Navigate to the module menu
3. Select "Four Track" from the Featured section
4. Observe the display

**Expected Results:**
- Module loads without errors
- Main view displays 4 tracks (T1-T4)
- Transport shows `[-]` (stopped)
- Track 1 is selected (highlighted)
- No error messages

**Pass/Fail:** [ ]

---

## Test 2: Track Selection

**Objective:** Verify track selection works via multiple input methods.

**Steps:**
1. Press Track Row 2 button (CC 41)
2. Observe display updates to highlight Track 2
3. Press Up arrow to move to Track 1
4. Press Down arrow to move to Track 2
5. Use Jog wheel to scroll to Track 4

**Expected Results:**
- Selected track changes as expected
- Highlight moves to selected track
- Track Row LEDs update (selected track lights in color)

**Pass/Fail:** [ ]

---

## Test 3: View Navigation

**Objective:** Verify view switching works.

**Steps:**
1. From Main view, press Menu button
2. Observe Patch view appears
3. Press Menu again
4. Observe Mixer view appears
5. Press Menu again
6. Observe return to Main view
7. Press Back from Main view
8. Observe return to Move Anything menu

**Expected Results:**
- Views cycle: Main -> Patch -> Mixer -> Main
- Each view displays correctly
- Back button returns to system menu

**Pass/Fail:** [ ]

---

## Test 4: Patch Loading

**Objective:** Verify patches can be browsed and loaded.

**Steps:**
1. Select Track 1
2. Press Menu to enter Patch view
3. Use Jog wheel to scroll through patches
4. Press Jog to load a patch
5. Observe confirmation overlay
6. Press Back to return to Main view
7. Verify Track 1 shows patch name

**Expected Results:**
- Patch list displays available chain patches
- Jog wheel scrolls through list
- Loading shows "Loaded: [patch name]" overlay
- Track displays associated patch name

**Pass/Fail:** [ ]

---

## Test 5: Record Arming

**Objective:** Verify track arming for recording.

**Steps:**
1. Select Track 1
2. Hold Shift and press Record
3. Observe Track 1 LED turns red
4. Observe Record button LED turns white
5. Hold Shift and press Record again
6. Observe Track 1 disarms (LED returns to color)

**Expected Results:**
- Armed track LED shows red
- Record LED shows white when any track armed
- Disarming returns LEDs to normal state

**Pass/Fail:** [ ]

---

## Test 6: Basic Recording

**Objective:** Verify recording captures audio.

**Steps:**
1. Load a patch to Track 1 (e.g., SF2 Piano)
2. Arm Track 1 for recording
3. Press Record to start recording
4. Play some notes on Move pads or MIDI
5. Wait 5-10 seconds
6. Press Record to stop
7. Observe Track 1 shows recording length

**Expected Results:**
- Record LED turns red during recording
- Audio is captured (verified by length display)
- Recording stops cleanly
- Track 1 shows "X.Xs" indicating length

**Pass/Fail:** [ ]

---

## Test 7: Playback

**Objective:** Verify recorded audio plays back.

**Steps:**
1. After recording Track 1 (Test 6)
2. Press Play
3. Listen for recorded audio
4. Press Play again to stop
5. Observe playhead returns to start

**Expected Results:**
- Play LED turns green
- Recorded audio plays through speakers/output
- Stop returns to beginning
- Playhead time shows in header

**Pass/Fail:** [ ]

---

## Test 8: Overdubbing

**Objective:** Verify recording one track while playing another.

**Steps:**
1. Record Track 1 as in Test 6
2. Select Track 2
3. Load a different patch
4. Arm Track 2 for recording
5. Press Record
6. Play notes while Track 1 audio plays
7. Stop recording
8. Press Play to verify both tracks

**Expected Results:**
- Track 1 audio plays during Track 2 recording
- Both tracks play back together after recording
- Tracks are independent (different content)

**Pass/Fail:** [ ]

---

## Test 9: Mixer Controls

**Objective:** Verify level and pan controls work.

**Steps:**
1. Record audio to Tracks 1 and 2
2. Press Menu twice to enter Mixer view
3. Turn Knob 1 to adjust Track 1 level
4. Observe overlay shows level value
5. Turn Knob 5 to adjust Track 1 pan
6. Observe overlay shows pan value
7. Use Master knob to adjust selected track
8. Play back and verify audio changes

**Expected Results:**
- Level knobs adjust track volume (0-100%)
- Pan knobs adjust stereo position (L-C-R)
- Overlay displays current values
- Audio output reflects mixer settings

**Pass/Fail:** [ ]

---

## Test 10: Mute and Solo

**Objective:** Verify mute and solo functions.

**Steps:**
1. Record audio to multiple tracks
2. Press Step 1 button to mute Track 1
3. Verify Track 1 shows [M] indicator
4. Play back and verify Track 1 is silent
5. Press Step 1 again to unmute
6. Hold Shift and press Step 2 to solo Track 2
7. Verify Track 2 shows [S] indicator
8. Play back and verify only Track 2 plays

**Expected Results:**
- Mute silences individual tracks
- Solo plays only selected tracks
- Indicators show current mute/solo state
- Audio output reflects mute/solo state

**Pass/Fail:** [ ]

---

## Test 11: Tempo Control

**Objective:** Verify tempo adjustment.

**Steps:**
1. Observe current tempo in footer (default 120)
2. Press Right arrow to increase tempo
3. Observe overlay shows new tempo
4. Press Left arrow to decrease tempo
5. Hold Shift and press Right to increase by 10
6. Enable metronome and verify click rate changes

**Expected Results:**
- Tempo adjusts by 1 BPM normally
- Tempo adjusts by 10 BPM with Shift
- Range limited to 20-300 BPM
- Metronome click reflects tempo

**Pass/Fail:** [ ]

---

## Test 12: Clear Track

**Objective:** Verify track clearing works.

**Steps:**
1. Record audio to Track 1
2. Verify Track 1 shows recording length
3. Select Track 1
4. Hold Shift and press appropriate control to clear
5. Verify Track 1 shows "Empty" or length 0

**Expected Results:**
- Track audio is cleared
- Track length returns to 0
- Track remains selected
- Other tracks unaffected

**Pass/Fail:** [ ]

---

## Test 13: Long Recording

**Objective:** Verify maximum recording time works.

**Steps:**
1. Arm a track for recording
2. Start recording and let it run
3. After 60 seconds, verify recording continues or stops gracefully
4. Verify recorded audio is intact

**Expected Results:**
- Recording up to 60 seconds works
- No audio glitches or crashes
- Buffer limits are respected

**Pass/Fail:** [ ]

---

## Test 14: Error Conditions

**Objective:** Verify graceful handling of error conditions.

**Steps:**
1. Try to record without arming a track
2. Try to record without loading a patch
3. Load module with no chain patches installed
4. Verify error messages or graceful degradation

**Expected Results:**
- Appropriate error messages displayed
- Module doesn't crash
- User can recover from error state

**Pass/Fail:** [ ]

---

## Test Summary

| Test | Description | Pass/Fail |
|------|-------------|-----------|
| 1 | Module Loading | [ ] |
| 2 | Track Selection | [ ] |
| 3 | View Navigation | [ ] |
| 4 | Patch Loading | [ ] |
| 5 | Record Arming | [ ] |
| 6 | Basic Recording | [ ] |
| 7 | Playback | [ ] |
| 8 | Overdubbing | [ ] |
| 9 | Mixer Controls | [ ] |
| 10 | Mute and Solo | [ ] |
| 11 | Tempo Control | [ ] |
| 12 | Clear Track | [ ] |
| 13 | Long Recording | [ ] |
| 14 | Error Conditions | [ ] |

**Total Passed:** ___/14

**Tester:** _________________
**Date:** _________________
**Version:** _________________
**Notes:**
