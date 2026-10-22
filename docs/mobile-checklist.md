# Mobile Verification Checklist & Parity Audit

This document provides a systematic audit report and verification checklist for mobile parity and touch-readability across Holocron. **All PRs that modify the Explorer UI must pass this checklist.**

## Testing Environment & Breakpoints
Verified at:
- **375px** (iPhone SE / Compact Mobile)
- **414px** (iPhone Pro Max / Large Mobile)
- **768px** (iPad Portrait / Tablet)

---

## Audit Findings & Resolution Matrix

| Severity | Component | Issue Description | Status | Resolution |
|---|---|---|---|---|
| **P0 (Blocking)** | `AppShell.tsx` / `Lineage` | Mobile Lineage view was hardcoded to `<LineagePlaceholder />`, completely blocking mobile users from accessing the 3D Force Graph lineage view. | **FIXED** | Replaced placeholder with `LineageView` graph renderer for mobile. |
| **P0 (Blocking)** | `TimelineScrubber.tsx` | Pointer scrubber checked `e.buttons === 1`, which prevented dragging on touch devices where `e.buttons` is 0 during touch moves. | **FIXED** | Added `e.pointerType === "touch" \|\| e.buttons === 1` to ensure touch drag scrubber functions smoothly. |
| **P1 (Degraded)** | `HoloStage.tsx` | Top-left entity title and Top-right side badge collided on 375px/414px screens. Close button was buried under tags with no touch-first button. | **FIXED** | Made header responsive (`left-4 top-4 max-w-[calc(100vw-70px)]`), gave Close button prominent top-right touch placement, and adjusted bottom ticker padding. |
| **P1 (Degraded)** | `SearchPalette.tsx` | On mobile touch devices without a physical `Esc` key or `Cmd+K`, no visible Close/Done button was available in the search header. | **FIXED** | Added touch-friendly `Done` button in mobile search header. |
| **P1 (Degraded)** | `DatapadDrawer.tsx` | Vertical scrolling inside drawer lacked overscroll containment, allowing pan gestures to chain to the 3D canvas behind it. | **FIXED** | Added `overscroll-contain touch-pan-y` to drawer scroll container. |
| **P2 (Nit)** | `GalaxyCanvas.tsx` | Bottom HUD text (`Drag to orbit · scroll to zoom`) was obscured behind the 56px bottom datapad drawer handle. | **FIXED** | Raised bottom HUD margin on mobile (`bottom-16 md:bottom-6`) and updated copy to `Drag to orbit · pinch to zoom`. |
| **P2 (Nit)** | `OpeningCrawl.tsx` & `EntityCrawl.tsx` | Skip button displayed desktop `<kbd>esc</kbd>` badge on mobile touch screens. | **FIXED** | Hidden keyboard badge on small viewports (`hidden md:inline`). |

---

## 1. Global Navigation & Layout
- [x] **No Horizontal Scroll**: The main application chrome does not leak horizontal scrollbars on 375px, 414px, or 768px.
- [x] **Touch Targets**: All navigation icons (Galaxy, Timeline, Lineage, Search, Stories, Mic) meet touch target guidelines (min 36-40px).
- [x] **Decluttered Bar**: On viewports < 640px, navigation cleanly groups views and tools (Search, Stories, Route, Voice).
- [x] **Safe Area Insets**: Top and bottom nav respect mobile browser safe areas.

## 2. Galaxy View
- [x] **HUD Safety**: Labels (Sector Grid, Drag to Orbit) have clearance from notch and bottom drawer (`bottom-16` on mobile).
- [x] **Touch Handling**: Orbit and Zoom respond smoothly to single-finger drag and two-finger pinch gestures.
- [x] **Planet Selection**: Tap on 3D planets selects entity and opens Datapad drawer.
- [x] **Hyperspace Route Mode**: Touch tap selects origin and destination planets with visible HUD.

## 3. Timeline View
- [x] **Touch Scrubbing**: Scrubbing across millennia works via direct thumb drag with pointer capture.
- [x] **Scrubber Cleanliness**: Era labels and anchors declutter on mobile; only critical anchors (Republic Founding, Battle of Yavin) show text.
- [x] **Battle Markers**: Compass star markers are tap-reachable on mobile and expand into tooltip cards showing ships involved and outcome.

## 4. Lineage View (3D Force Graph)
- [x] **Mobile Availability**: Full 3D force graph renders on mobile instead of placeholder.
- [x] **Touch Gestures**: Rotate, pan, and zoom touch interactions supported on mobile WebGL canvas.
- [x] **Node Tap**: Tapping a person node selects entity and updates selection store.

## 5. Datapad (Mobile Drawer)
- [x] **Peek & Expand**: 56px peek bar is thumb-tappable; expands smoothly to 70vh on tap.
- [x] **Scroll Locking**: Scrolling through relations, lore, and quotes is locked inside drawer via `overscroll-contain touch-pan-y`.
- [x] **Crawl & Clip Support**: Film entities show "Crawl" and "Clip" touch buttons.
- [x] **Pivot Parity**: All pivot buttons (Galaxy, Timeline, Lineage) are present and functional in peek and expanded modes.
- [x] **Battle & Ships Parity**: Selecting a battle displays full battle tactical summary, belligerents, and horizontally scrollable ship chips that cross-pivot.

## 6. Cinematic Stories Library UI
- [x] **Mobile Sheet**: Stories picker renders as a bottom sheet on mobile (`max-md:max-h-[85vh]`).
- [x] **All 4 Stories Accessible**: Rise of Vader, The Rule of Two, The Skywalker Lineage, The Clone Wars.
- [x] **Now Playing Indicator**: Pulsing status badge and play/pause controls.
- [x] **Dismissibility**: Tap outside, tap Close icon, or press Esc dismisses picker.

## 7. Voice Control UI
- [x] **Touch Trigger**: Mic button in mobile nav rail starts/stops speech recognition.
- [x] **Visual Waveform**: Responsive HUD confirms recognized intents ("Show me Tatooine", "Plot route...") before executing.
- [x] **Inline Error Fallback**: Graceful messaging if microphone permission is denied or Web Speech API is unsupported.

## 8. Cinematic Overlays (Opening Crawl & HoloStage)
- [x] **Skip Reachability**: The "Skip intro" / "Skip crawl" button is reachable and not obscured by notches (`top-8`).
- [x] **HoloStage Full-Bleed**: No clipped overlays or text collisions on mobile viewports.
- [x] **Touch Dismissal**: Prominent Close button and backdrop tap dismiss the HoloStage hologram.
