## Design language: "Soft Tactile Bento" (v2)

Reference: the attached screenshots (pastel color-blocking, big rounded tiles, progress rings, black pill buttons). Plexus is a calm study app: bright enough to feel alive, quiet enough to look at an anatomy plate for ten minutes.

### The one hard rule
**A category color never touches a photo.** Anatomy plates and photos always sit on a neutral white stage (`bg-stage`, `--stage: #fff`, in light and dark mode). The category color lives *around* the image: the screen background, the tile frame, the header. No tint, no `mix-blend-mode`, no overlay on the image itself.
- The label covers ("dichten") use the stage color, so they stay invisible on a white plate. The marker keeps its red outline. Neither changes with the category.

### Color as state
- Every category gets its own pastel (butter, periwinkle, mint, peach, sky, lilac). Users pick it when creating a category.
- On the study screen the whole background takes the category color, with a smooth cross-fade between categories. The photo stage on top stays white.
- Neutrals: warm off-white (#FAF8F3) in light mode, near-black (#141414) in dark mode. The primary action is always a black pill (white pill in dark mode).
- Dark text on every pastel (`on-pastel`), never white. Contrast must meet WCAG AA.

### Not a flat sheet
- **Plus grid:** a quiet grid of small "+" signs behind the app screens (`plus-grid`, 7% of the text color, 32px apart). No blurs, no gradients.
- **Progress rings:** circular progress with a number in the middle (`ProgressRing`). Hero tile: cards done today out of done + due. Category tile: share of the category that is up to date.
- **Week strip:** Monday to Sunday dots: ink with a check for a practised day, a peach ring for today, dashed for days to come. Next to it the real streak, counted from the review log.
- Paper grain stays at 2–3% on colored backgrounds.

### Shape and layout
- Radius is generous everywhere: tiles 28–32px, chips and buttons fully pill-shaped.
- Home is a bento: a large pastel "Verder leren" hero with a black "Start nu" pill and a ring, the week strip, then category tiles in their own colors (the first one full width, then pairs).
- Card tiles in a category: the tile is the category color, the photo sits inset on its own white stage with a rounded frame, the name below in display type.
- The home header is the "Hoi, [name]!" greeting with a one-line status under it. There is no search bar until search actually works.
- Bottom tab bar with 4 icons: Home, Study, Library, Profile.
- Study is a short flow: choose what (everything, one category, several categories), then pick the categories on their own screen. Settings that rarely change (direction with checkboxes, new cards per session as a few fixed choices, notifications) live in the profile, not on the study screen.
- Info that would be a wall of text goes behind a small info icon (`InfoHint`): shown on hover, kept open on click or tap.

### Study card
- The current card is large and slightly tilted, with the next card peeking out behind it. Image direction: the plate on the white stage. Location direction: upright, so taps map to the image.
- Reveal the answer with a soft slide-up sheet, never a hard cut.
- Rating buttons (Again / Hard / Good / Easy) are four pills in one row, each a tint of the category color, with a face icon (frown to smile). Under each pill the next interval.
- Practice mode shows an "Oefenen" badge and never changes the review schedule.

### Typography
- Headlines: Bricolage Grotesque, large and slightly tight, for a confident, editorial feel.
- Body and UI: DM Sans.
- Latin names in italic, secondary color.

### Motion
- Motion confirms a choice; it never decorates a page that just opened. Pills bounce (`pop`) only after the user picks them on that screen, not for what was already selected on arrival. Navigation never bounces the tab bar.
- No hover animations: no lift, no scale. Press feedback (tiles scale slightly while pressed) stays.
- Rings and progress bars fill with easing when their value changes. Entrances are a short fade at most, never a zoom.
- Respect `prefers-reduced-motion`.

### Illustration and empty states
- Empty states use simple black line drawings on colored circles. They are the only illustrations; tiles carry no decoration.
- Dashboard chart (later): soft rounded bars per day, bar color is the category color of that day's study.

### Dark mode
- Near-black background, cards in #1E1E1E, pastels muted but recognizable, white pill as primary button.
- Follow the system setting with a manual toggle.

### Accessibility
- Contrast meets WCAG AA on every pastel background. The plus grid is decorative and faint.
- Tap targets are at least 48px (info buttons, list buttons, pills).
- Every ring and week dot has a text alternative.
