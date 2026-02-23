# Design Guidelines: ForeSight Interface

## Design Approach: **Fluent Design System**

**Rationale:** Clean enterprise design optimized for data-dense applications with conversational interfaces. Powered by OpenAI for intelligent agent capabilities.

---

## Core Design Principles

1. **Information Clarity** - Dense data must be scannable at a glance
2. **Conversational Context** - Chat interface drives navigation, cards provide depth
3. **Action-Oriented** - Every metric should enable a decision
4. **Professional Trust** - Critical infrastructure planning requires confidence in data

---

## Typography System

**Font Stack:** Segoe UI (primary), -apple-system, system-ui fallbacks

**Hierarchy:**
- Page Headers: text-2xl font-semibold (ForeSight topic titles)
- Card Headers: text-lg font-semibold (Adaptive card titles)
- Section Labels: text-sm font-semibold uppercase tracking-wide (metric categories)
- Data Values: text-3xl font-bold (critical metrics), text-xl font-semibold (secondary metrics)
- Body Text: text-base (descriptions, chat messages)
- Metadata: text-sm (timestamps, IDs, supplementary info)
- Captions: text-xs (units, footnotes)

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 4, 6, 8, 12** (e.g., p-4, gap-6, mb-8)

**Container Strategy:**
- Chat Interface: max-w-4xl centered conversation flow
- Adaptive Cards: w-full with internal max-w-3xl
- Data Grids: Full-width responsive tables
- Metric Dashboards: Grid-based with gap-6

---

## Component Library

### 1. Conversational Interface
**Chat Messages:**
- User messages: Right-aligned, max-w-lg
- Bot responses: Left-aligned, max-w-2xl with typing indicators
- Spacing between messages: space-y-4
- Message padding: p-4
- Timestamp placement: text-xs below message, pt-1

### 2. Adaptive Cards (Primary Data Display)

**Card Structure:**
- Outer container: Subtle border, rounded-lg, shadow-sm
- Internal padding: p-6
- Section spacing: space-y-6

**Header Section:**
- Title + timestamp layout: flex justify-between items-start
- Subtitle metadata: pt-2, text-sm

**Metric Display Patterns:**

*Critical Metrics (Top Priority):*
- Large value + label: text-3xl font-bold with text-xs uppercase label above
- Arranged in grid-cols-2 md:grid-cols-4, gap-6
- Utilize FactSet component with clear title/value pairs

*Status Indicators:*
- Badge-style pills for risk levels (CRITICAL, HIGH, MEDIUM, LOW)
- Inline with entity names, font-semibold text-xs uppercase px-2 py-1 rounded-full

*Data Tables (Substation lists, impact analysis):*
- Responsive grid structure: grid-cols-1 divide-y
- Each row: p-4 hover:bg-subtle transition
- Three-column layout per row: Entity (40%), Metrics (30%), Status (30%)
- Primary identifier: font-semibold
- Secondary ID/metadata: text-sm pt-1

**Progress & Utilization Bars:**
- Height: h-2 rounded-full
- Container: Full width with percentage overlay
- Value display: Absolute positioned at end, text-sm font-semibold

### 3. Map Integration (ArcGIS)

**Map Container:**
- Aspect ratio: aspect-video for embedded maps
- Border: rounded-lg overflow-hidden
- Minimum height: min-h-96
- Loading state: Skeleton with pulsing animation

**Map Overlays (Substations, Data Centers):**
- Marker clusters at zoom-out
- Detail cards on pin selection: p-4 shadow-lg rounded-lg max-w-sm

### 4. Action Buttons

**Primary Actions (inside cards):**
- Full-width mobile: w-full sm:w-auto
- Grouped with gap-3
- Button sizing: px-6 py-3
- Font: text-base font-semibold

**Secondary/Tertiary Actions:**
- Link-style buttons within card content
- Underline on hover
- Icon prefix for clarity (download, navigate, analyze)

### 5. Data Visualization Components

**Chart Integration (Load Forecasts, Capacity):**
- Container: aspect-square md:aspect-video
- Padding: p-4 around chart
- Legend: Below chart, flex flex-wrap gap-4
- Axis labels: text-xs

**Comparison Tables (Scenarios):**
- Sticky header row on scroll
- Alternating row treatment for scannability
- Highlight column for recommended scenario

### 6. Alert & Warning Components

**Inline Alerts (Upgrade Required, Over Capacity):**
- Left border accent (border-l-4)
- Icon + message layout: flex gap-3, p-4
- Alert levels hierarchy clear through icon + spacing

**Toast Notifications (Flow Completion):**
- Fixed bottom-right positioning
- Auto-dismiss after 5s
- Stacked when multiple: space-y-2

### 7. Loading & Empty States

**Skeleton Loaders:**
- Match card structure exactly
- Pulsing animation
- Height approximations (h-8 for titles, h-4 for text lines)

**Empty States:**
- Centered vertically: flex items-center justify-center min-h-64
- Icon + message + action suggestion
- Icon size: w-16 h-16

---

## Responsive Behavior

**Breakpoint Strategy:**
- Mobile-first: Single column, stacked metrics
- md (768px): 2-column grids, side-by-side comparisons
- lg (1024px): 3-4 column dashboards, expanded data tables

**Card Adaptation:**
- Mobile: Full-width cards, vertical metric stacking
- Desktop: Horizontal metric layouts, multi-column FactSets

---

## Interaction Patterns

**Card Expansion:**
- Collapsible sections for detailed substation analysis
- Chevron indicators: transition-transform rotate-180
- Expanded content: pt-4 with subtle divider

**Follow-up Actions:**
- Quick action chips below primary card content
- Horizontal scroll on mobile: flex overflow-x-auto snap-x
- Chip styling: px-4 py-2 rounded-full text-sm

**Contextual Help:**
- Info icons next to technical terms
- Tooltip on hover/tap: max-w-xs p-3 shadow-lg

---

## Accessibility Standards

- Minimum touch targets: 44x44px for all interactive elements
- Form inputs: Consistent h-12 height, p-3 padding
- Focus indicators: 2px solid ring with offset-2
- ARIA labels on all data visualizations and icon-only buttons
- Keyboard navigation: Logical tab order through card sections

---

## Images

**No hero images** - This is a functional enterprise interface. Visual elements are:
- **Map screenshots/embeds** in analysis cards showing geographic context
- **Company/utility logo** in header (h-8)
- **Icon library:** Use Fluent UI System Icons via CDN for consistency with Microsoft ecosystem