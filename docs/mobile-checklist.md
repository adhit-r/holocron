# Mobile Verification Checklist

This document provides a systematic checklist for verifying mobile parity and touch-readability in Holocron. **All PRs that modify the Explorer UI must pass this checklist.**

## Testing Environment
Test at the following breakpoints (using Chrome DevTools or physical devices):
- **375px** (iPhone SE / Compact Mobile)
- **414px** (iPhone Pro Max / Large Mobile)
- **768px** (iPad Portrait / Tablet)

---

## 1. Global Navigation
- [ ] **No Horizontal Scroll**: The main application chrome must not have horizontal scrollbars.
- [ ] **Touch Targets**: All navigation icons (Galaxy, Timeline, Lineage, Search) must be at least 40x40px for easy thumb-reach.
- [ ] **Decluttered Bar**: On viewports < 640px, navigation should prioritize primary icons. Secondary tools (Atlas, Audio) must be compact.

## 2. Galaxy View
- [ ] **HUD Safety**: Labels (Sector Grid, Drag to Orbit) must have at least 6px margin from the screen edges.
- [ ] **3D Labels**: Ensure planet and event labels do not overlap at the galactic origin (staggering should be active).
- [ ] **Touch Handling**: Orbit and Zoom must respond smoothly to touch gestures.

## 3. Timeline View
- [ ] **Scrubber Cleanliness**: Era labels must not overlap. On mobile, only critical anchors (e.g., Republic Founding, Battle of Yavin) should be visible.
- [ ] **Label Clipping**: Scrubber labels must not clip at the left or right edges of the screen.

## 4. Datapad (Mobile Drawer)
- [ ] **Pivot Parity**: All pivot buttons (Galaxy, Timeline, Lineage) must be present and functional.
- [ ] **Crawl Support**: Film entities must show a "Crawl" button that triggers the cinematic opening.
- [ ] **Scroll Locking**: Scrolling inside the Datapad drawer should not trigger accidental pans in the 3D canvas behind it.

## 5. Cinematic Overlays (Opening Crawl)
- [ ] **Skip Reachability**: The "Skip" button must be reachable and not obscured by notches or browser chrome (min `top-8`).
- [ ] **Full-Bleed**: Navigation and Timeline chrome must be hidden while a cinematic crawl is active.

## 6. Search Palette
- [ ] **Mobile Entry**: A clear search icon must be available in the mobile navigation rail.
- [ ] **Result Legibility**: Results list should be easy to scroll and tap on a mobile device.
