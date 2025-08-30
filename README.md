# OrientAware — One‑page Mobile Orientation Web App

A mobile‑first, one‑page web app that **detects how you’re holding your phone** and switches features instantly:

- **Portrait (upright / primary)** → ⏰ **Alarm Clock**
- **Portrait (upside‑down / secondary)** → ⏳ **Timer**
- **Landscape (primary)** → ⏱️ **Stopwatch**
- **Landscape (secondary)** → 🌤️ **Weather of the Day** (via free **Open‑Meteo** API; no key needed)

Built to satisfy the hackathon requirements: responsive, touch‑friendly, client‑only, Android & iOS compatible, seamless transitions.

## Live URL (Prototype)

- Deploy the `index.html` to any static host (Netlify, GitHub Pages, Vercel).  
  **Suggested:** drag‑and‑drop to Netlify Drop. After deploy, paste your URL here:  
  `https://<your-site>.netlify.app/`

## Approach (AI‑first Development)

1. **Spec → UI skeleton:** Prompted an AI assistant to produce a mobile‑first layout with large tap targets, gradient cards, and a status banner showing the current orientation mapping.
2. **Reliable orientation detection:** Combined three signals for cross‑platform reliability:
   - `screen.orientation.type` and `screen.orientation.angle` when available.
   - Fallback to legacy `window.orientation` (works on iOS Safari).
   - Final fallback via `devicemotion` gravity vector to distinguish **portrait‑primary vs portrait‑secondary** (upright vs upside‑down) and landscape variants.
3. **Feature modules (Alarm/Timer/Stopwatch/Weather):** Each feature is self‑contained and toggled by orientation. Timers use `requestAnimationFrame` for smooth, battery‑friendly updates.
4. **Audio/Vibration:** WebAudio generates a pleasant bell (no assets). `navigator.vibrate` for subtle haptics (when supported).
5. **Weather API:** Uses **Open‑Meteo** (free tier, no key, CORS‑enabled). Geolocation with graceful denial handling.
6. **Progressive enhancement:** Optional “Enable Motion Access” card to request iOS permission for motion data. Simulation buttons aid desktop testing & the demo video.
7. **Perf & DX:** No frameworks, zero dependencies, single page. Everything runs locally in the browser.

## AI Tools Used

- **ChatGPT (code generation & reviews):** Generated initial scaffolding, iterated on orientation logic, and refined UI copy and styles.
- **Code Linting via AI prompts:** Asked AI to check for potential iOS/Safari pitfalls (motion permission, `window.orientation` fallback).

## Prompting Techniques & Example Prompts

Techniques applied:
- **Role prompting:** “Act as a mobile web engineer targeting iOS Safari quirks…”
- **Constraint prompting:** Enumerated hard requirements (one page, no libs, Open‑Meteo, iOS motion permission).
- **Self‑consistency checks:** “List edge cases where upside‑down may fail; propose fallbacks.”
- **Failure‑driven prompts:** When an approach didn’t work, asked for alternatives and added a simulator.

Example prompts (successful):
- *“Write a single‑file mobile web app that switches between four tools based on `screen.orientation` and `devicemotion` fallbacks. Include large buttons, WebAudio alarm, Open‑Meteo fetch with geolocation, and a permission CTA for iOS.”*
- *“Map Open‑Meteo WMO codes to a short description + emoji and show H/L for today.”*

Example prompts (failed / revised):
- *“Use only `orientationchange` to detect upside‑down on iOS.”* → **Failed** because upside‑down detection was unreliable without motion gravity; added `devicemotion` fallback.
- *“Rely solely on `screen.orientation`.”* → **Failed** on older iOS Safari; added `window.orientation` + gravity fallback.

> You can paste your own prompts and outputs here if your hackathon requires originals.

## How orientation is mapped

- **`portrait-primary`** → Alarm
- **`portrait-secondary`** → Timer
- **`landscape-primary`** → Stopwatch
- **`landscape-secondary`** → Weather

If your judges swapped left/right mappings, update labels in `labelFor()`.

## Demo Video (≤ 2 minutes) — Suggested Script

1. **Intro (5s):** Show the URL on your phone. “This is *OrientAware*, an AI‑built mobile web app.”
2. **Alarm (15s):** Hold phone **upright** → app shows Alarm. Set a time a minute ahead, tap **Test** to preview bell.
3. **Timer (20s):** Rotate **upside‑down** → Timer. Set 10s, Start → hear bell on finish.
4. **Stopwatch (20s):** Rotate **landscape (primary)** → Stopwatch. Start, Lap twice, Stop, Reset.
5. **Weather (20s):** Rotate to **other landscape** → Weather. Tap **Refresh** to allow location; show temp and H/L.
6. **iOS permissions (10s):** If on iPhone, briefly show **Enable Motion Access** button.
7. **Outro (10s):** Mention it’s client‑only, free API, works on Android & iOS.

Keep the simulator buttons handy (top of screen) to quickly switch features if rotation doesn’t trigger on camera.

## Run Locally

Just open `index.html` in a mobile browser. For geolocation + secure context, prefer `https://` (use `npx serve` or deploy to Netlify).

## Tech Notes

- **Audio**: Resumes/suspends with page visibility to save battery.
- **Timers**: Use `requestAnimationFrame` for smooth updates; all time math in ms.
- **Weather**: `https://api.open-meteo.com/v1/forecast` with `current.temperature_2m` / `current.weather_code` and today’s high/low.
- **A11y/UX**: Large tap targets; color‑contrast; readable type; haptic feedback where supported.

## Code & Prompts

This repository consists of a single `index.html`. Copy prompts into `prompts.md` if needed by your submission portal.
