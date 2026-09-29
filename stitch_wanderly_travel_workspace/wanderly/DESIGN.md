---
name: Wanderly
colors:
  surface: '#fdf8f6'
  surface-dim: '#ddd9d7'
  surface-bright: '#fdf8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f0'
  surface-container: '#f2edeb'
  surface-container-high: '#ece7e5'
  surface-container-highest: '#e6e2df'
  on-surface: '#1c1b1a'
  on-surface-variant: '#56423d'
  inverse-surface: '#31302f'
  inverse-on-surface: '#f4f0ee'
  outline: '#8a726c'
  outline-variant: '#ddc0ba'
  surface-tint: '#a04028'
  primary: '#9d3d26'
  on-primary: '#ffffff'
  primary-container: '#bd553b'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a2'
  secondary: '#486172'
  on-secondary: '#ffffff'
  secondary-container: '#c9e3f7'
  on-secondary-container: '#4d6677'
  tertiary: '#4c6156'
  on-tertiary: '#ffffff'
  tertiary-container: '#64796e'
  on-tertiary-container: '#f5fff7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a2'
  on-primary-fixed: '#3c0700'
  on-primary-fixed-variant: '#802913'
  secondary-fixed: '#cce6fa'
  secondary-fixed-dim: '#b0cadd'
  on-secondary-fixed: '#011e2d'
  on-secondary-fixed-variant: '#314a5a'
  tertiary-fixed: '#d1e8da'
  tertiary-fixed-dim: '#b5ccbf'
  on-tertiary-fixed: '#0b1f17'
  on-tertiary-fixed-variant: '#374b41'
  background: '#fdf8f6'
  on-background: '#1c1b1a'
  surface-variant: '#e6e2df'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.035em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 34px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-mono-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.02em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: -0.01em
  label-ui:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 2px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-base: 16px
  space-lg: 24px
  space-xl: 32px
  space-2xl: 48px
  gutter-desktop: 16px
  margin-desktop: 24px
  gutter-mobile: 12px
  margin-mobile: 16px
---

## Brand & Style

This design system embodies an editorial, high-precision utility aesthetic engineered for discerning travelers, digital nomads, and travel curators. It rejects generic consumer travel tropes—oversaturated photography, whimsical floating elements, and loud gradients—in favor of a disciplined productivity workspace inspired by Linear, Notion, and classic Swiss industrial typography.

The experience evokes the feeling of handling a meticulously bound Smythson travel journal paired with the real-time speed of a modern developer environment. 

### Key Characteristics
- **Restrained & Tactile:** Flat surfaces defined by delicate hairline dividers (`1px`), subtle warm-parchment background shifts, and precise spatial density.
- **Editorial Utility:** Dense data grids, flight timelines, itinerary segments, and currency breakdowns rendered with clinical typographic clarity.
- **Calm Warmth:** A foundational canvas rooted in unbleached cotton, warm chalk, and deep sumi charcoal, offset by a calibrated terracotta earth accent.

## Colors

The palette establishes an architectural warmth using natural, mineral-inspired tones. High contrast is achieved via value differentiation rather than synthetic saturation.

### Functional Roles
- **Base Canvas (`#FAF9F6`):** The primary view layer; an organic, warm off-white that minimizes eye strain during extended trip-planning sessions.
- **Surface Elevation (`#F5F4F0`):** Recessed containers, table headers, sidebars, and input wells.
- **Surface Popover / Card (`#FFFFFF`):** Selected cards, contextual popovers, and elevated modal panels.
- **Hairline Border (`#E6E4DD`):** Structural 1px separation lines across all UI frames, dividers, and data tables.
- **Primary Accent (`#C2593F` - Terracotta Cedar):** High-priority actions, active states, timeline indicators, and progress milestones.
- **Secondary Accent (`#2F4858` - Deep Slate Indigo):** Status indicators, airline code tags, metadata headers, and secondary focus triggers.
- **Tertiary Accent (`#5B7065` - Forest Sage):** Confirmed bookings, balanced budgets, and positive variances.
- **Typography Primary (`#1A1918`):** Deep charcoal ink tone; softer than raw black (`#000000`) while preserving absolute contrast.
- **Typography Secondary (`#686764`):** Supporting metadata, departure codes, timestamps, and placeholder copy.

## Typography

Typography balances rapid scanning with dense administrative organization:

- **Geist** delivers crisp geometric forms, low-contrast stroke terminals, and tight tracking suited for multi-pane dashboards and nested task outlines.
- **JetBrains Mono** is deployed for tactical alphanumeric data: airport IATA codes (`HND`, `LHR`), flight numbers, booking reference codes, currency figures, and time zone offsets (`GMT+9`).
- Use tabular figures (`font-variant-numeric: tabular-nums`) across all numerical inputs, cost ledgers, and itinerary schedules to maintain perfect column alignment.

## Layout & Spacing

The workspace uses a composite multi-pane split layout. The structural grid balances maximum visible data with generous inner-cell breathing room:

### Multi-Pane Architecture
- **Global Navigation Bar:** Fixed 56px condensed left utility rail (or top collapsible strip on mobile).
- **Secondary Context Pane:** Collapsible 280px master list for active trips, document vaults, and packing workflows.
- **Canvas / Board View:** Fluid center workspace adjusting dynamically between list, board, calendar, and split timeline layouts.
- **Inspector / Detail Drawer:** 380px contextual right sidebar for flight boarding passes, itemized costs, and map segments.

### Responsive Breakpoints
- **Desktop (`>= 1280px`):** Full 3-pane layout active concurrently with 16px gutter grid.
- **Tablet (`768px - 1279px`):** Secondary context pane collapses into an overlay drawer. Inspector transitions to a modal sheet.
- **Mobile (`< 768px`):** Single-column stacked view. Toolbars pin to bottom thumbsafe regions with 16px margins.

## Elevation & Depth

This system intentionally eliminates blurred ambient dropshadows and heavy blurs. Depth is rendered strictly via tonal layer staging and razor-sharp borderlines:

### Tonal Tiers
1. **Base Layer (Level 0 - `#FAF9F6`):** The foundational substrate behind all panes.
2. **Sub-Panel (Level 1 - `#F5F4F0`):** Recessed containers, search bars, filter toolbars, and inactive segments. Surrounded by a 1px border of `#E6E4DD`.
3. **Card & Active Items (Level 2 - `#FFFFFF`):** High-priority focus nodes, open itinerary items, active board cards. Border: `1px solid #E6E4DD`.
4. **Floating Overlays & Popovers (Level 3 - `#FFFFFF`):** Contextual dropdowns, date pickers, and shortcut palettes. Styled with `1px solid #DCD9D0` and a precise micro-shadow: `0 2px 4px rgba(26, 25, 24, 0.04), 0 8px 16px rgba(26, 25, 24, 0.06)`.

## Shapes

The design maintains an architectural, restrained geometry. Elements use a baseline radius of `4px` to `6px`, avoiding generic pill cards and bubbly surfaces:

- **Micro elements (Badges, Chips, Form Inputs):** `4px` radius.
- **Cards, Panels, Dialogs:** `6px` to `8px` radius.
- **Pill Badges (Status Nodes Only):** Fully rounded (`9999px`) reserved strictly for status pills (e.g., "On Time", "Confirmed", "In Transit").

## Components

### Buttons
- **Primary:** Solid `#C2593F` fill, white `#FFFFFF` text, `4px` radius, height `32px` (compact) or `38px` (default). Hover: `#AD4C34`. Active: subtle downward transform `translateY(0.5px)`.
- **Secondary:** Surface `#FFFFFF`, border `1px solid #E6E4DD`, text `#1A1918`. Hover: background `#F5F4F0`, border `#DCD9D0`.
- **Ghost / Utility:** Transparent fill, text `#686764`. Hover: background `#EAE8E1`, text `#1A1918`.

### Segmented Controls & Tabs
- Contained inside an outer track (`#EAE8E1`) with `4px` internal padding.
- Selected tab features a crisp `#FFFFFF` pill tile with `1px solid #DCD9D0` border and `#1A1918` font weight 500.
- Unselected tabs use muted `#686764` text with seamless hover transition.

### Itinerary Timeline Nodes
- Left-hand vertical hairline (`1px solid #E6E4DD`).
- Checkpoint nodes use a 7px solid terracotta square (`#C2593F`) for major transitions (departures/arrivals) and hollow 7px rings for intermediate activities.
- Time indicators set strictly in `JetBrains Mono` 11px uppercase tabular figures.

### Form Inputs & Search Fields
- Minimalist text wells: background `#FFFFFF`, border `1px solid #E6E4DD`, corner radius `4px`.
- Active focus state: border `1px solid #C2593F`, accompanied by a zero-blur outline ring `1px solid rgba(194, 89, 63, 0.25)`.
- Monospace auxiliary markers for keyboard shortcuts (e.g., `⌘K`, `ESC`) aligned right in `#8E8D8A`.

### Travel Data Cards & Expense Trackers
- Encased in `1px solid #E6E4DD` on `#FFFFFF` backgrounds.
- Headers separated by a horizontal hairline divider.
- Cost meters leverage horizontal micro-bars (`4px` height) with proportional fills across categories: Terracotta (Flights), Slate Indigo (Lodging), Sage (Dining), Charcoal (Transport).
- Weather cards display single-line minimalist vector icons with high-density tabular temperature spreads (`H 24° / L 16°`).