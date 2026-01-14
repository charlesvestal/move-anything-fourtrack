/*
 * Four Track Recorder UI
 *
 * A 4-track recorder interface with transport controls, track selection,
 * and signal chain integration.
 */

import * as std from 'std';
import * as os from 'os';
import { isCapacitiveTouchMessage, setButtonLED, setLED, clearAllLEDs } from '../../shared/input_filter.mjs';
import { MoveBack, MoveMenu, MovePlay, MoveRec, MoveRecord, MoveShift,
         MoveUp, MoveDown, MoveLeft, MoveRight, MoveMainKnob, MoveMainButton,
         MoveRow1, MoveRow2, MoveRow3, MoveRow4, MoveKnob1, MoveKnob2, MoveKnob3, MoveKnob4,
         MoveKnob5, MoveKnob6, MoveKnob7, MoveKnob8, MoveMaster,
         White, Black, BrightRed, BrightGreen, OrangeRed, Cyan, LightGrey,
         WhiteLedDim, WhiteLedBright } from '../../shared/constants.mjs';
import { drawMenuHeader, drawMenuList, drawMenuFooter, menuLayoutDefaults,
         showOverlay, tickOverlay, drawOverlay, isOverlayActive } from '../../shared/menu_layout.mjs';
import { createTextScroller } from '../../shared/text_scroll.mjs';

/* ============================================================================
 * Constants
 * ============================================================================ */

const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 64;

const NUM_TRACKS = 4;

/* MIDI CCs */
const CC_JOG = MoveMainKnob;
const CC_JOG_CLICK = MoveMainButton;
const CC_BACK = MoveBack;
const CC_MENU = MoveMenu;
const CC_PLAY = MovePlay;
const CC_REC = MoveRec;
const CC_RECORD = MoveRecord;
const CC_SHIFT = MoveShift;
const CC_UP = MoveUp;
const CC_DOWN = MoveDown;
const CC_LEFT = MoveLeft;
const CC_RIGHT = MoveRight;

/* Track row CCs (for track selection) */
const TRACK_ROWS = [MoveRow1, MoveRow2, MoveRow3, MoveRow4];  /* Top to bottom, matches display */

/* Knobs for track controls (when in mixer view) */
const LEVEL_KNOBS = [MoveKnob1, MoveKnob2, MoveKnob3, MoveKnob4];
const PAN_KNOBS = [MoveKnob5, MoveKnob6, MoveKnob7, MoveKnob8];

/* All knobs for synth macro mapping */
const ALL_KNOBS = [MoveKnob1, MoveKnob2, MoveKnob3, MoveKnob4, MoveKnob5, MoveKnob6, MoveKnob7, MoveKnob8];

/* Track colors */
const TRACK_COLORS = [
    BrightRed,     /* Track 1 */
    OrangeRed,     /* Track 2 */
    BrightGreen,   /* Track 3 */
    Cyan           /* Track 4 */
];

/* ============================================================================
 * State
 * ============================================================================ */

/* View modes */
const VIEW_MAIN = "main";
const VIEW_PATCH = "patch";
const VIEW_MIXER = "mixer";
let viewMode = VIEW_MAIN;

/* Track state (synced from DSP) */
let tracks = [];
for (let i = 0; i < NUM_TRACKS; i++) {
    tracks.push({
        level: 0.8,
        pan: 0.0,
        muted: false,
        solo: false,
        length: 0,
        patch: "Empty"
    });
}

let selectedTrack = 0;
let armedTrack = -1;
let transport = "stopped";
let recordEnabled = false;  /* Record mode - when true, play will start recording */
let tempo = 120;
let metronomeEnabled = false;
let loopEnabled = false;
let playheadMs = 0;

/* Patch browser */
let patches = [];
let patchCount = 0;
let selectedPatch = 0;

/* UI state */
let shiftHeld = false;
let needsRedraw = true;
let tickCount = 0;
const REDRAW_INTERVAL = 6;

/* Text scroller for selected track's patch name */
const patchNameScroller = createTextScroller();

/* ============================================================================
 * Helpers
 * ============================================================================ */

function getParam(key) {
    return host_module_get_param(key);
}

function setParam(key, val) {
    host_module_set_param(key, String(val));
}

function syncState() {
    /* Sync transport state */
    transport = getParam("transport") || "stopped";
    selectedTrack = parseInt(getParam("selected_track") || "0");
    armedTrack = parseInt(getParam("armed_track") || "-1");
    tempo = parseInt(getParam("tempo") || "120");
    metronomeEnabled = getParam("metronome") === "1";
    loopEnabled = getParam("loop_enabled") === "1";
    playheadMs = parseInt(getParam("playhead") || "0");

    /* Sync track states */
    for (let i = 0; i < NUM_TRACKS; i++) {
        tracks[i].level = parseFloat(getParam(`track_${i}_level`) || "0.8");
        tracks[i].pan = parseFloat(getParam(`track_${i}_pan`) || "0.0");
        tracks[i].muted = getParam(`track_${i}_muted`) === "1";
        tracks[i].solo = getParam(`track_${i}_solo`) === "1";
        tracks[i].length = parseFloat(getParam(`track_${i}_length`) || "0");
        tracks[i].patch = getParam(`track_${i}_patch`) || "Empty";
    }

    /* Sync patches for browser */
    patchCount = parseInt(getParam("patch_count") || "0");
}

function loadPatches() {
    patches = [];
    /* Add "None" as first option (default) */
    patches.push({ index: -1, name: "(None)" });
    for (let i = 0; i < patchCount; i++) {
        const name = getParam(`patch_name_${i}`);
        if (name) {
            patches.push({ index: i, name: name });
        }
    }
    selectedPatch = 0;  /* Default to "None" */
}

/* Query knob mapping info and show overlay */
function showKnobOverlay(knobNum) {
    const name = getParam(`knob_${knobNum}_name`);
    if (!name) return false;  /* Knob not mapped */

    const value = getParam(`knob_${knobNum}_value`);
    const type = getParam(`knob_${knobNum}_type`);
    const min = parseFloat(getParam(`knob_${knobNum}_min`) || "0");
    const max = parseFloat(getParam(`knob_${knobNum}_max`) || "1");

    /* Format display value */
    let displayValue;
    if (type === "int") {
        displayValue = value;
    } else {
        /* For float values, show percentage or raw value depending on range */
        const floatVal = parseFloat(value);
        if (min === 0 && max === 1) {
            displayValue = `${Math.round(floatVal * 100)}%`;
        } else {
            displayValue = floatVal.toFixed(2);
        }
    }

    showOverlay(name, displayValue);
    return true;
}

function formatTime(ms) {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins}:${s.toString().padStart(2, '0')}.${tenths}`;
}

/* ============================================================================
 * LED Control
 * ============================================================================ */

function updateLEDs() {
    /* Track row LEDs - green when selected, red when armed, white otherwise */
    for (let i = 0; i < NUM_TRACKS; i++) {
        let color = White;
        if (i === armedTrack) {
            color = BrightRed;
        } else if (i === selectedTrack) {
            color = BrightGreen;
        }
        setButtonLED(TRACK_ROWS[i], color);
    }

    /* Transport LEDs */
    /* Play LED - white when stopped, green when playing/recording */
    if (transport === "playing" || transport === "recording") {
        setButtonLED(CC_PLAY, BrightGreen);
    } else {
        setButtonLED(CC_PLAY, White);
    }

    /* Record button (CC_REC) - white when off, red when record mode enabled */
    if (recordEnabled || transport === "recording") {
        setButtonLED(CC_REC, BrightRed);
    } else {
        setButtonLED(CC_REC, White);
    }

    /* Sample button (CC_RECORD) - red if selected track is armed, white otherwise */
    if (armedTrack === selectedTrack && armedTrack >= 0) {
        setButtonLED(CC_RECORD, BrightRed);
    } else {
        setButtonLED(CC_RECORD, White);
    }

    /* Navigation buttons */
    setButtonLED(CC_MENU, WhiteLedBright);
    setButtonLED(CC_BACK, WhiteLedBright);

    /* Left/Right arrows - green at start/end of track content, white otherwise */
    const trackLengthMs = tracks[selectedTrack].length * 1000;
    const atStart = playheadMs <= 0;
    const atEnd = trackLengthMs > 0 && playheadMs >= trackLengthMs - 50;  /* 50ms tolerance */
    setButtonLED(CC_LEFT, atStart ? BrightGreen : White);
    setButtonLED(CC_RIGHT, atEnd ? BrightGreen : White);
}

/* ============================================================================
 * Drawing
 * ============================================================================ */

function drawMainView() {
    clear_screen();

    /* Header with transport info */
    const transportIcon = transport === "recording" ? "[REC]" :
                         transport === "playing" ? "[>]" : "[-]";
    drawMenuHeader("Four Track", `${transportIcon} ${formatTime(playheadMs)}`);

    /* Draw 4 track rows */
    const trackHeight = 12;
    const startY = 15;

    for (let i = 0; i < NUM_TRACKS; i++) {
        const y = startY + i * trackHeight;
        const track = tracks[i];
        const isSelected = i === selectedTrack;
        const isArmed = i === armedTrack;

        /* Track indicator */
        const prefix = isArmed ? "R" : isSelected ? ">" : " ";

        /* Level/Pan info (right side) - fixed width: "L:XX P:XXX" */
        const levelVal = Math.min(99, Math.round(track.level * 100));
        const levelStr = levelVal.toString().padStart(2, '0');
        let panStr;
        const panVal = Math.round(track.pan * 50);
        if (panVal < -2) {
            panStr = `L${(-panVal).toString().padStart(2, '0')}`;
        } else if (panVal > 2) {
            panStr = `R${panVal.toString().padStart(2, '0')}`;
        } else {
            panStr = "C00";
        }
        const lpInfo = `L:${levelStr} P:${panStr}`;
        const lpInfoWidth = lpInfo.length * 6 + 4;

        /* Track name with patch - calculate available space */
        const prefixWidth = 18;  /* "R " or "> " = 2 chars + space */
        const availableWidth = SCREEN_WIDTH - prefixWidth - lpInfoWidth;
        const maxChars = Math.floor(availableWidth / 6);

        let fullName = `T${i + 1}`;
        if (track.patch !== "Empty") {
            fullName += `: ${track.patch}`;
        }

        let displayName;
        if (isSelected && fullName.length > maxChars) {
            /* Use scroller for selected track with long name */
            patchNameScroller.setSelected(i);
            displayName = patchNameScroller.getScrolledText(fullName, maxChars);
        } else if (fullName.length > maxChars) {
            /* Truncate non-selected tracks */
            displayName = fullName.substring(0, maxChars - 2) + "..";
        } else {
            displayName = fullName;
        }

        /* Draw row */
        if (isSelected) {
            fill_rect(0, y, SCREEN_WIDTH, trackHeight, 1);
            print(2, y + 2, `${prefix} ${displayName}`, 0);
            print(SCREEN_WIDTH - lpInfo.length * 6 - 2, y + 2, lpInfo, 0);
        } else {
            print(2, y + 2, `${prefix} ${displayName}`, 1);
            print(SCREEN_WIDTH - lpInfo.length * 6 - 2, y + 2, lpInfo, 1);
        }
    }

    /* Draw overlay if active */
    drawOverlay();
}

function drawPatchView() {
    clear_screen();
    drawMenuHeader(`T${selectedTrack + 1} Patch`, "Select");

    if (patches.length === 0) {
        print(2, 30, "No patches found", 1);
        print(2, 42, "Check chain/patches/", 1);
    } else {
        drawMenuList({
            items: patches,
            selectedIndex: selectedPatch,
            topY: menuLayoutDefaults.listTopY,
            getLabel: (item) => item.name,
            getValue: () => ""
        });
    }

    drawOverlay();
}

function drawMixerView() {
    clear_screen();

    /* 4 channels across 128px = 32px each */
    const channelWidth = 32;
    const faderWidth = 16;
    const faderHeight = 40;
    const startY = 10;
    const panY = 56;  /* Y position for pan tick area */

    for (let i = 0; i < NUM_TRACKS; i++) {
        const channelX = i * channelWidth;
        const faderX = channelX + (channelWidth - faderWidth) / 2;
        const track = tracks[i];
        const isSelected = i === selectedTrack;
        const isArmed = i === armedTrack;

        /* Track number at top */
        const label = `${i + 1}`;
        print(channelX + 13, 0, label, 1);

        /* Selection/arm indicator */
        if (isArmed) {
            print(channelX + 2, 0, "R", 1);
        } else if (isSelected) {
            print(channelX + 2, 0, ">", 1);
        }

        /* Fader background */
        fill_rect(faderX, startY, faderWidth, faderHeight, 1);

        /* Fader fill (from bottom) */
        const fillHeight = Math.floor(track.level * (faderHeight - 2));
        if (fillHeight > 0) {
            fill_rect(faderX + 1, startY + faderHeight - 1 - fillHeight, faderWidth - 2, fillHeight, 0);
        }

        /* Pan tick at bottom - pan range is -1 to +1, map to 0-30px within channel */
        const panRange = channelWidth - 2;
        const panX = channelX + 1 + Math.floor((track.pan + 1) / 2 * panRange);
        /* Draw center line */
        fill_rect(channelX + channelWidth / 2, panY, 1, 5, 1);
        /* Draw pan position tick */
        fill_rect(panX, panY + 1, 2, 3, 1);
    }

    /* No overlay in mixer view */
}

function draw() {
    switch (viewMode) {
        case VIEW_MAIN:
            drawMainView();
            break;
        case VIEW_PATCH:
            drawPatchView();
            break;
        case VIEW_MIXER:
            drawMixerView();
            break;
    }
}

/* ============================================================================
 * MIDI Handling
 * ============================================================================ */

function handleCC(cc, val) {
    /* Shift state */
    if (cc === CC_SHIFT) {
        shiftHeld = val > 63;
        needsRedraw = true;
        return;
    }

    /* Transport controls */
    if (cc === CC_PLAY && val > 63) {
        if (transport === "stopped") {
            /* If record mode enabled and a track is armed, start recording */
            if (recordEnabled && armedTrack >= 0) {
                setParam("transport", "record");
            } else {
                setParam("transport", "play");
            }
        } else {
            setParam("transport", "stop");
            recordEnabled = false;  /* Clear record mode when stopping */
        }
        syncState();
        needsRedraw = true;
        return;
    }

    /* Record button (CC_REC) - toggle record mode */
    if (cc === CC_REC && val > 63) {
        recordEnabled = !recordEnabled;
        needsRedraw = true;
        return;
    }

    if (cc === CC_RECORD && val > 63) {
        /* Toggle arm on selected track */
        if (armedTrack === selectedTrack) {
            setParam("arm_track", "-1");
        } else {
            setParam("arm_track", String(selectedTrack));
        }
        syncState();
        needsRedraw = true;
        return;
    }

    /* Track row buttons */
    for (let i = 0; i < NUM_TRACKS; i++) {
        if (cc === TRACK_ROWS[i] && val > 63) {
            if (shiftHeld) {
                /* Shift+Track = arm track */
                setParam("arm_track", String(i));
                syncState();
            } else if (i === selectedTrack) {
                /* Tap already-selected track = toggle patch browser */
                if (viewMode === VIEW_PATCH) {
                    viewMode = VIEW_MAIN;
                } else {
                    loadPatches();
                    viewMode = VIEW_PATCH;
                }
            } else {
                /* Switch to different track = select it and return to main view */
                setParam("select_track", String(i));
                syncState();
                if (viewMode === VIEW_PATCH) {
                    viewMode = VIEW_MAIN;
                }
            }
            needsRedraw = true;
            return;
        }
    }

    /* Navigation */
    if (cc === CC_BACK && val > 63) {
        if (viewMode !== VIEW_MAIN) {
            viewMode = VIEW_MAIN;
        } else {
            host_return_to_menu();
        }
        needsRedraw = true;
        return;
    }

    if (cc === CC_MENU && val > 63) {
        /* Toggle between main and mixer */
        if (viewMode === VIEW_MIXER) {
            viewMode = VIEW_MAIN;
        } else {
            viewMode = VIEW_MIXER;
        }
        needsRedraw = true;
        return;
    }

    /* Up/Down for track selection in main view */
    if (viewMode === VIEW_MAIN) {
        if (cc === CC_UP && val > 63) {
            if (selectedTrack > 0) {
                setParam("select_track", String(selectedTrack - 1));
                syncState();
                needsRedraw = true;
            }
            return;
        }
        if (cc === CC_DOWN && val > 63) {
            if (selectedTrack < NUM_TRACKS - 1) {
                setParam("select_track", String(selectedTrack + 1));
                syncState();
                needsRedraw = true;
            }
            return;
        }

        /* Left = jump to start, Right = jump to end of track */
        if (cc === CC_LEFT && val > 63) {
            setParam("goto_start", "1");
            syncState();
            showOverlay("Position", "Start");
            needsRedraw = true;
            return;
        }
        if (cc === CC_RIGHT && val > 63) {
            setParam("goto_end", "1");
            syncState();
            showOverlay("Position", "End");
            needsRedraw = true;
            return;
        }
    }

    /* Jog wheel */
    if (cc === CC_JOG) {
        const delta = val < 64 ? val : val - 128;

        if (viewMode === VIEW_PATCH && patches.length > 0) {
            selectedPatch = (selectedPatch + delta + patches.length) % patches.length;
            needsRedraw = true;
        } else if (viewMode === VIEW_MAIN) {
            /* Jog = scroll through tracks */
            const newTrack = selectedTrack + (delta > 0 ? 1 : -1);
            if (newTrack >= 0 && newTrack < NUM_TRACKS) {
                setParam("select_track", String(newTrack));
                syncState();
                needsRedraw = true;
            }
        }
        return;
    }

    /* Jog click */
    if (cc === CC_JOG_CLICK && val > 63) {
        if (viewMode === VIEW_MAIN) {
            /* In main view: open patch browser for selected track */
            loadPatches();
            viewMode = VIEW_PATCH;
            needsRedraw = true;
        } else if (viewMode === VIEW_PATCH && patches.length > 0) {
            /* In patch view: load the selected patch and return to main */
            const patchIndex = patches[selectedPatch].index;
            if (patchIndex < 0) {
                /* "None" selected - clear the patch */
                setParam("clear_patch", String(selectedTrack));
                showOverlay("Cleared", `Track ${selectedTrack + 1}`);
            } else {
                setParam("load_patch", String(patchIndex));
                showOverlay("Loaded", patches[selectedPatch].name);
            }
            syncState();
            viewMode = VIEW_MAIN;
            needsRedraw = true;
        }
        return;
    }

    /* Knob handling depends on view mode */
    if (viewMode === VIEW_MIXER) {
        /* In mixer view: knobs 1-4 control levels, 5-8 control pans */

        /* Level knobs (1-4) */
        for (let i = 0; i < 4; i++) {
            if (cc === LEVEL_KNOBS[i]) {
                const delta = val < 64 ? val : val - 128;
                const newLevel = Math.max(0, Math.min(1, tracks[i].level + delta * 0.02));
                setParam("track_level", `${i}:${newLevel.toFixed(2)}`);
                syncState();
                showOverlay(`T${i + 1} Level`, `${Math.round(newLevel * 100)}%`);
                needsRedraw = true;
                return;
            }
        }

        /* Pan knobs (5-8) */
        for (let i = 0; i < 4; i++) {
            if (cc === PAN_KNOBS[i]) {
                const delta = val < 64 ? val : val - 128;
                const newPan = Math.max(-1, Math.min(1, tracks[i].pan + delta * 0.05));
                setParam("track_pan", `${i}:${newPan.toFixed(2)}`);
                syncState();
                const panStr = newPan < -0.1 ? `L${Math.round(-newPan * 50)}` :
                              newPan > 0.1 ? `R${Math.round(newPan * 50)}` : "C";
                showOverlay(`T${i + 1} Pan`, panStr);
                needsRedraw = true;
                return;
            }
        }
    } else {
        /* In main/patch views: knobs control synth macros */
        /* The knob CC is forwarded to DSP by the host, we just need to show overlay */
        for (let i = 0; i < ALL_KNOBS.length; i++) {
            if (cc === ALL_KNOBS[i]) {
                const knobNum = i + 1;  /* Knobs are 1-indexed */
                /* Query the knob mapping info and show overlay */
                if (showKnobOverlay(knobNum)) {
                    needsRedraw = true;
                }
                return;
            }
        }
    }

    /* Master knob for selected track level */
    if (cc === MoveMaster) {
        const delta = val < 64 ? val : val - 128;
        const newLevel = Math.max(0, Math.min(1, tracks[selectedTrack].level + delta * 0.02));
        setParam("track_level", `${selectedTrack}:${newLevel.toFixed(2)}`);
        syncState();
        showOverlay(`T${selectedTrack + 1} Level`, `${Math.round(newLevel * 100)}%`);
        needsRedraw = true;
        return;
    }
}

function handleNote(note, vel) {
    /* Step buttons could be used for mute/solo */
    if (note >= 16 && note <= 19 && vel > 0) {
        const trackIdx = note - 16;
        if (shiftHeld) {
            /* Shift+Step = solo */
            setParam("track_solo", String(trackIdx));
        } else {
            /* Step = mute */
            setParam("track_mute", String(trackIdx));
        }
        syncState();
        needsRedraw = true;
        return;
    }
}

function onMidiMessage(msg, source) {
    if (!msg || msg.length < 3) return;

    /* Filter capacitive touch */
    if (isCapacitiveTouchMessage(msg)) return;

    const status = msg[0] & 0xF0;
    const data1 = msg[1];
    const data2 = msg[2];

    if (status === 0xB0) {
        handleCC(data1, data2);
    } else if (status === 0x90 || status === 0x80) {
        const vel = status === 0x80 ? 0 : data2;
        handleNote(data1, vel);
    }
}

/* ============================================================================
 * Lifecycle
 * ============================================================================ */

function init() {
    /* Clear LEDs first */
    clearAllLEDs();

    /* Initial sync */
    syncState();
    loadPatches();

    /* Initial LED state */
    updateLEDs();

    /* Initial draw */
    draw();
}

function tick() {
    tickCount++;

    /* Handle overlay timeout */
    if (tickOverlay()) {
        needsRedraw = true;
    }

    /* Tick the patch name scroller */
    if (patchNameScroller.tick()) {
        needsRedraw = true;
    }

    /* Periodic state sync and redraw */
    if (tickCount % REDRAW_INTERVAL === 0) {
        syncState();
        updateLEDs();
        needsRedraw = true;
    }

    if (needsRedraw) {
        draw();
        needsRedraw = false;
    }
}

/* Export module interface */
globalThis.init = init;
globalThis.tick = tick;
globalThis.onMidiMessageInternal = onMidiMessage;
globalThis.onMidiMessageExternal = onMidiMessage;
