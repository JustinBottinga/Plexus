## Design language: "Soft Tactile Bento"

Reference: the attached screenshots. Match their feel (soft pastel color-blocking, big rounded cards, pill buttons, bento home screen), adapted for anatomy study.

### Color as state
- Every category gets its own pastel color (e.g. butter yellow, periwinkle, mint, peach, sky, lilac). Users can pick it when creating a category
- On the study screen the whole background takes the category color, with a smooth cross-fade when switching category
- Neutrals: warm off-white (#FAF8F3) in light mode, near-black (#141414) in dark mode. Primary action is always a black pill (white pill in dark mode)
- One shared accent for ratings and streaks, taken from the active category color

### Shape and layout
- Radius is generous everywhere: cards 28–32px, chips and buttons fully pill-shaped
- Home screen is a bento grid: one dark "Continue studying" tile showing due cards, one light tile with the streak, then a list of category tiles in their own colors
- Rounded search pill at the top: "Hi [name]!" greeting plus search across all cards
- Bottom tab bar with 4 icons: Home, Study, Library, Profile

### Study card
- The illustration sits on a large rounded "stage" tinted with the category color. Use mix-blend-mode: multiply on the image so white backgrounds of anatomy plates blend into the tint
- Cards are shown as a stack: the current card is large and slightly tilted, with the next card peeking out at the sides
- Reveal the answer with a soft flip or slide-up sheet, never a hard cut
- Rating buttons (Again / Hard / Good / Easy) are four pills in one row, each in a tint of the category color, with a tiny face icon (frown to smile) like in the references

### Typography
- Headlines: Bricolage Grotesque (Google Fonts), large and slightly tight, for a confident, editorial feel
- Body and UI: DM Sans
- Latin names in italic, secondary color

### Texture and motion
- Very subtle paper-grain overlay (2–3% opacity) on colored backgrounds so they don't feel flat
- Springy micro-interactions: cards scale on press, pills bounce on select, progress bar fills with easing
- Respect prefers-reduced-motion

### Illustration and empty states
- Empty states use simple black line drawings (one-line style) on colored circles, like in the references
- Dashboard chart: soft rounded bars per day, bar color is the category color of that day's study

### Dark mode
- Near-black background, cards in #1E1E1E, category colors become muted but stay recognizable, white pill as primary button
- Follow system setting with a manual toggle

### Accessibility
- Contrast must meet WCAG AA on every pastel background (use dark text, never white, on pastels)
- Tap targets at least 48px
