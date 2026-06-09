# TanteEmma – UI & UX Design Specification

> This document defines the visual language, interaction patterns, and component
> specifications for TanteEmma. Reference this when implementing frontend components.

---

## Design Philosophy

**Nostalgic warmth, modern execution.**
"Tante Emma" evokes the warmth of a neighborhood corner shop — personal, familiar, trustworthy.
The UI translates this into: a warm typeface, saturated but not harsh colors, generous spacing,
and interactions that feel immediate and physical (swipes, taps, haptic-like animations).

**Not a productivity tool.** Shopping is a chore. The app should feel like picking things
up and putting them in a basket — light, physical, satisfying.

---

## Typography

```css
/* Import in app.html <head> */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');

:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

### Type Scale
```
--text-xs:   11px / 1.4  (labels, badges)
--text-sm:   13px / 1.5  (secondary text, metadata)
--text-base: 16px / 1.6  (body, list items)
--text-lg:   18px / 1.5  (section headers)
--text-xl:   22px / 1.3  (screen titles)
--text-2xl:  28px / 1.2  (Fraunces, major headings)
--text-3xl:  36px / 1.1  (Fraunces, logo/splash)
```

---

## Color System

### Full Palette
```css
:root {
  /* === Primary: Fuchsia === */
  --fuchsia-50:  #fdf4ff;
  --fuchsia-100: #fae8ff;
  --fuchsia-200: #f5d0fe;
  --fuchsia-300: #f0abfc;
  --fuchsia-400: #e879f9;
  --fuchsia-500: #d946ef;   /* ← PRIMARY */
  --fuchsia-600: #c026d3;
  --fuchsia-700: #a21caf;
  --fuchsia-800: #86198f;
  --fuchsia-900: #701a75;

  /* === Accent: Emerald === */
  --emerald-50:  #ecfdf5;
  --emerald-100: #d1fae5;
  --emerald-400: #34d399;
  --emerald-500: #10b981;   /* ← ACCENT */
  --emerald-600: #059669;
  --emerald-700: #047857;

  /* === Semantic Tokens === */
  --color-primary:        var(--fuchsia-500);
  --color-primary-hover:  var(--fuchsia-600);
  --color-primary-light:  var(--fuchsia-100);
  --color-accent:         var(--emerald-500);
  --color-accent-light:   var(--emerald-100);

  --color-success:        #10b981;
  --color-warning:        #f59e0b;
  --color-danger:         #ef4444;
  --color-info:           #3b82f6;

  /* === Light Mode Surfaces === */
  --surface-base:         #ffffff;
  --surface-raised:       #f9fafb;
  --surface-overlay:      #f3f4f6;
  --surface-inverse:      #111827;

  --border-subtle:        #e5e7eb;
  --border-default:       #d1d5db;
  --border-strong:        #9ca3af;

  --text-primary:         #111827;
  --text-secondary:       #4b5563;
  --text-muted:           #9ca3af;
  --text-inverse:         #ffffff;
  --text-primary-brand:   var(--fuchsia-700);

  /* === Shadows === */
  --shadow-sm:   0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:   0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-lg:   0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:   0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.04);
}

[data-theme="dark"] {
  --surface-base:         #0d0d10;
  --surface-raised:       #18181f;
  --surface-overlay:      #222230;
  --surface-inverse:      #f9fafb;

  --border-subtle:        #2d2d3d;
  --border-default:       #3d3d50;
  --border-strong:        #5a5a72;

  --text-primary:         #f3f4f6;
  --text-secondary:       #9ca3af;
  --text-muted:           #6b7280;
  --text-inverse:         #111827;
  --text-primary-brand:   var(--fuchsia-300);

  --color-primary:        var(--fuchsia-400);  /* lighter in dark mode */
  --color-primary-light:  rgba(217,70,239,0.15);
  --color-accent:         var(--emerald-400);
  --color-accent-light:   rgba(16,185,129,0.15);

  --shadow-sm:   0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:   0 4px 6px rgba(0,0,0,0.4);
}
```

### Category Colors (predefined set, consistent across light/dark)
```
Obst & Gemüse:      #22c55e  (green-500)
Kühlregal:          #06b6d4  (cyan-500)
Brot & Backwaren:   #f59e0b  (amber-500)
Tiefkühl:           #818cf8  (indigo-400)
Getränke:           #3b82f6  (blue-500)
Süßwaren:           #f43f5e  (rose-500)
Fleisch & Wurst:    #ef4444  (red-500)
Fisch:              #0ea5e9  (sky-500)
Käse:               #eab308  (yellow-500)
Nudeln & Reis:      #f97316  (orange-500)
Konserven:          #84cc16  (lime-500)
Gewürze:            #a78bfa  (violet-400)
Hygiene:            #e879f9  (fuchsia-400) ← primary
Reinigung:          #14b8a6  (teal-500)
Haushalt:           #64748b  (slate-500)
Drogerie:           #d946ef  (fuchsia-500)
Baby:               #fb7185  (rose-400)
Tier:               #92400e  (amber-800)
Sonstiges:          #9ca3af  (gray-400)
```

---

## Spacing System
```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Safe Areas (iOS notch / home indicator)
```css
padding-top:    env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

---

## Component Specifications

### 1. Bottom Navigation Bar

```
Height: 64px + safe-area-inset-bottom
Background: --surface-base with backdrop-blur
Border-top: 1px --border-subtle
Position: fixed bottom-0

4 tabs:
  🛒  Listen     /lists
  🏪  Läden      /stores
  🕐  Verlauf    /history
  ⚙️  Einst.     /settings

Active tab: icon + label in --color-primary, background pill --color-primary-light
Inactive: --text-muted, no label (icon only on small screens)
Tab tap: scale(0.92) for 80ms then back — subtle physical feedback
```

### 2. Add Item Bar

```
Position: sticky top-0, below OS status bar
Height: 56px
Background: --surface-base
Border-bottom: 1px --border-subtle
Box-shadow: --shadow-sm (when content scrolls beneath)
Padding: 0 16px
z-index: 100

Layout: [🔍 icon 20px] [input flex-1] [camera icon 24px] [+ button 40×40]

Input:
  font: --font-body, 16px (prevents iOS zoom)
  placeholder: "Hinzufügen…" / "Add item…" / "Adicionar…"
  background: --surface-overlay
  border-radius: 12px
  padding: 8px 12px
  border: none
  outline: 2px solid transparent
  focus: outline-color --color-primary, transition 150ms

+ Button:
  40×40px circle
  background: --color-primary
  color: white
  icon: Plus 20px
  border-radius: 50%
  active: scale(0.9), 80ms
```

### 3. Suggestion Dropdown

```
Position: absolute, full width below Add Item Bar
Background: --surface-base
Border: 1px --border-subtle
Border-radius: 0 0 16px 16px
Box-shadow: --shadow-lg
Max-height: 320px, overflow-y scroll
z-index: 99

Each suggestion row: 56px height
Layout:
  [category color dot 10px] [product name --text-primary] [brand --text-muted text-sm]
  [spacer] [category icon + name --text-muted text-xs] [store badge?]

First 3 results: history/frequency matches (show small 🕐 icon)
Remaining: DB matches

"+ Create 'query'" row at bottom:
  [+ icon --color-primary] ["'query' hinzufügen"] italic style
  Height: 48px

Keyboard: ArrowUp/Down navigates, Enter selects, Escape closes
Touch: tap selects, adds item immediately
```

### 4. List Item (List View)

```
Height: 56px (minimum, grows with content)
Padding: 0 16px
Background: --surface-base
Border-bottom: 1px --border-subtle

Layout (left to right):
  [checkbox 24px] [category color line 3px] [16px gap]
  [item name --text-primary 16px / brand --text-muted 13px (if set)]
  [spacer]
  [store badge (if not default)] [quantity badge (if set)]
  [presence avatar 20px (if someone else has it checked)]

Checkbox:
  24×24px, border 2px --border-default, border-radius 6px
  Checked: background --color-accent, border --color-accent, checkmark white
  Transition: 120ms, slight scale-up on check

Category color line:
  3×24px vertical bar, border-radius 2px
  Color from category palette

Checked item appearance:
  name: text-decoration line-through, color --text-muted
  opacity: 0.6
  checkbox: --color-accent filled

Swipe right → Details sheet (emerald reveal background, 📝 icon)
Swipe left → Delete (red reveal background, 🗑 icon, 48px action zone)
Long press → enter multi-select mode
```

### 5. Tile View

```
Grid: 2 columns, gap 8px, padding 16px
Tile size: width 100%, aspect-ratio not fixed — min-height 80px

Each tile:
  Border-radius: 16px
  Background: --surface-raised
  Border-left: 4px solid [category color]
  Padding: 12px 14px
  Box-shadow: --shadow-sm

  Layout:
    [category icon 20px emoji] [store badge top-right if set]
    [product name 15px/600 --text-primary, max 2 lines]
    [brand 12px --text-muted (if brand)]
    [quantity badge bottom-right (if set)]

  Checked:
    opacity: 0.5
    background: --surface-overlay
    border-left-color: --border-subtle
    name: line-through

  Tap: scale(0.95) 80ms → scale(1) 150ms (spring feel)
```

### 6. Category Header (in List View)

```
Height: 36px
Padding: 0 16px
Background: --surface-raised
Position: sticky (below add bar + sort bar)
z-index: 50

Layout:
  [category icon 16px] [category name --text-secondary 13px/600 uppercase letter-spacing 0.05em]
  [spacer]
  [item count badge --text-muted 12px]
  [chevron for collapse toggle]

Collapse: items slide up, header chevron rotates 180°, animation 200ms ease
```

### 7. Sort & Filter Bar

```
Height: 44px
Horizontal scroll (no wrapping)
Padding: 0 16px, gap 8px
Background: --surface-base
Border-bottom: 1px --border-subtle

Pill buttons:
  Height: 32px
  Padding: 0 12px
  Border-radius: 20px
  Font: 14px/500
  Default: background --surface-overlay, color --text-secondary
  Active: background --color-primary-light, color --color-primary, border 1px --color-primary

Pills: [📁 Kategorie] [🏪 REWE ▾] [🏪 Lidl ▾] [↕ Datum] [A-Z]
Store pills replace with actual store names.
Tapping a store pill → filters list to that store + applies shelf order sort.
```

### 8. Checked Items Footer

```
Padding: 16px
Background: --surface-raised
Border-top: 1px --border-subtle (when visible)

Collapsed state:
  "✓ 3 erledigt" (--text-muted, 14px) [Alle löschen] button right-aligned
  Tap to expand

Expanded state:
  Shows checked items (same as regular list items, grayed style)
  [Alle löschen] button — danger style, confirmation sheet before delete
```

### 9. Item Detail Bottom Sheet

```
Style: slides up from bottom
Backdrop: rgba(0,0,0,0.4) blur
Border-radius: 24px 24px 0 0
Background: --surface-base
Max-height: 80vh
Drag handle: 36×4px pill, --border-strong, centered, margin-top 12px

Sections:
  Product name (Fraunces, 22px) + category badge
  ─────────────────────────
  Menge: [number input] [unit dropdown: Stk./g/kg/ml/l/Pkg.]
  Laden: [store picker chips]
  Notiz: [text input]
  ─────────────────────────
  [Admin only: "Produkt bearbeiten" link]
  [Löschen — danger, text button, bottom]

Save: auto-save on change (debounced 500ms), no explicit save button
Close: swipe down, tap backdrop, or X button
```

### 10. Presence Avatars

```
Position: top-right of list screen header
Overlapping circles: -8px margin between each

Avatar: 28×28px circle
  If user has photo: their avatar
  If no photo: colored circle with initials, color derived from user ID hash

Tooltip on tap: "[Name] ist gerade aktiv"

On item: tiny avatar (20px) appears on right side of item row when
  another user is currently viewing that list and recently touched that item
```

### 11. Offline Banner

```
Position: top of screen, below status bar
Height: 36px
Background: --color-warning (amber)
Color: dark text
Text: "Offline — Änderungen werden synchronisiert sobald du wieder online bist"
Font: 12px, center-aligned
Icon: ⚡ left side

Disappears with slide-up animation when back online
Shows sync animation briefly (⟳ spinning) then disappears
```

### 12. Barcode Scanner Overlay

```
Full-screen camera feed
Dark overlay with transparent scanning window (250×250px centered, rounded 16px)
Corner markers: fuchsia colored, animated pulse
Status text below window: "Barcode scannen…"
Cancel button: top-left, white text
Torch button: top-right (if device supports)
```

### 13. Empty States

```
List is empty:
  Large emoji: 🛒
  Heading (Fraunces): "Liste ist leer"
  Body: "Tippe oben, um etwas hinzuzufügen."
  No CTA button (the add bar is already visible)

No lists:
  Large emoji: 📋
  Heading: "Noch keine Listen"
  Button: [+ Erste Liste erstellen] (primary)

No search results:
  Show "+'query' hinzufügen" suggestion only
```

---

## Interaction Patterns

### Adding an Item (primary flow)

```
1. Tap add bar → keyboard appears, bar gains focus ring
2. Type query → suggestions appear after 150ms debounce
3. Tap suggestion → item appears at top of correct category (slide-in 200ms)
   Input clears, focus stays in bar for next item
4. Tap + button with text → same as tapping top suggestion
5. Tap "Neu anlegen" → opens Item Detail Sheet pre-filled with typed name
```

### Checking Off an Item

```
Tap checkbox → optimistic: immediate visual check (no wait for server)
  Animation: checkbox fills emerald, item fades/moves to checked section
  Server confirms via event → no visual change needed (already done)

If server fails → revert after 3s with toast "Konnte nicht synchronisiert werden"
```

### Swipe Delete

```
Swipe left 60px → red background reveals with trash icon
Swipe left 100%+ → executes delete
At 60px: haptic feedback (if supported: navigator.vibrate(10))

After delete:
  Item slides out 150ms
  Snackbar appears: "Entfernt [Undo]" — 5 second timeout
  Undo: re-adds item via event
```

### Pull to Refresh

```
Pull down 60px → spinner appears
Release → sync with server
Animation: subtle bounce at top of list
```

---

## Navigation & Screen Transitions

```
Bottom tab switch: instant, no animation (standard mobile pattern)
List → Shopping list: slide up from bottom (shared element: list card)
Back navigation: slide down
Bottom sheet open: slide up with backdrop fade
Bottom sheet close: swipe down or slide down
```

---

## App Shell & Logo

### Logo/Wordmark
```
"Tante" in Fraunces italic, --color-primary
"Emma" in Fraunces regular 700, --text-primary
Shopping bag icon (custom, fuchsia) left of text

App icon: fuchsia background (#d946ef), white shopping bag icon
```

### Splash Screen
```
Background: fuchsia gradient (--fuchsia-500 to --fuchsia-700)
Logo centered, white
Tagline (DM Sans, 14px, white 70%): "Einkaufen. Einfach."
```

---

## Responsive Behavior

TanteEmma is **mobile-first**. Desktop is a bonus, not a target.

```
< 480px  (phone portrait): primary target. Full-width everything.
480-768px (phone landscape / small tablet): 2-column tile grid, wider add bar
> 768px  (tablet+): optional: sidebar navigation instead of bottom nav,
                    list + detail side-by-side, max-width 900px centered
```

Desktop (> 1024px): same as tablet, but add subtle background texture
(noise grain on --surface-base, opacity 2%) to feel intentional not stretched.

---

## Micro-interactions Checklist

- [ ] Checkbox check: spring scale + color fill, 120ms
- [ ] Item add: slide in from top, 200ms ease-out
- [ ] Item delete: swipe + fade out, 150ms
- [ ] Suggestion appear: fade + translate-y(-4px), staggered 30ms per item
- [ ] Store filter activate: pill background transition, 150ms
- [ ] Category collapse: height animate, chevron rotate, 200ms
- [ ] Bottom sheet: slide up, spring overshoot ~2%, 280ms
- [ ] Offline banner: slide down from top, 250ms
- [ ] Sync spinner: smooth rotation, appears on reconnect
- [ ] Tab active: scale(1.05) icon + color transition, 100ms
- [ ] Add bar focus: border color transition, 150ms
- [ ] Tile tap: scale(0.95) + back, 80+150ms

All animations respect `prefers-reduced-motion: reduce` — disable transitions,
keep instant state changes.

---

## Accessibility

- All interactive elements: minimum 48×48px touch target
- Color is never the only indicator of state (always paired with icon/text)
- Focus rings: 2px offset, --color-primary color (visible in both modes)
- Screen reader: aria-label on icon-only buttons, aria-live on list changes
- Contrast ratios: minimum 4.5:1 for body text, 3:1 for large text (WCAG AA)
- Fuchsia-500 on white: 4.52:1 ✓ (borderline — test and use fuchsia-600 if needed)
- Fuchsia-400 on dark (#0d0d10): 6.2:1 ✓
