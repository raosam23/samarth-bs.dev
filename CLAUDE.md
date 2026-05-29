# Portfolio Website Development Guidelines

A personal portfolio website with a modern, simplistic, and cool purple-themed design, featuring a digital-twin chatbot powered by OpenRouter.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (or Tailwind CSS if configured)
- **Deployment:** Vercel
- **AI Chatbot:** OpenRouter API (Free tier LLM models)
- **Package Manager:** Bun

## Common Commands

### Development
```bash
# Run local development server
bun dev

# Build the production bundle
bun run build

# Start production server locally
bun start
```

### Code Quality & Testing
```bash
# Run ESLint check
bun run lint

# Run TypeScript compilation check
bunx tsc --noEmit
```

## Coding Guidelines

### Design System & Theme (Purple Theme)
- **CSS Variables & Colors (`app/globals.css`):**
  - Base Background (`--bg`): `#0c0817` (Deep almost-black violet)
  - Elevation Background (`--bg-elev`): `#1a1330`
  - Vibrant Accent (`--accent`): `#a855f7` (Core purple)
  - Soft Accent (`--accent-soft`): `#c4b5fd` (Pastel lavender)
  - Primary Text (`--text`): `#f5f3ff` (Off-white lavender)
  - Muted Text (`--text-muted`): `#d6cef0` (Lavender gray)
  - Dim Text (`--text-dim`): `#8a829c`
  - Core Border (`--border`): `#261d3d`
  - Soft Border (`--border-soft`): `rgba(168, 139, 250, 0.08)`
- **Backgrounds:**
  - Hero Section: Solid deep royal purple (`#120926`)
  - Global Body/Other Sections: Solid deep violet-black (`--bg` / `#0c0817`)
- **Typography:**
  - Display Titles/Headings: **Playfair Display** (`var(--font-display)`) — serif, elegant. Used for the hero name and section headings.
  - Body Text / Navigation / Buttons: **Urbanist** (`var(--font-sans)`) — geometric, modern sans-serif.
  - Mono Labels / Role Label / CTA Arrows: **Exo 2** (`var(--font-mono)`) — geometric, futuristic. Used for "FULL-STACK AI ENGINEER" label, button arrows, and chat widget.
  - Chat Widget Text bubbles: Explicitly override back to `var(--font-sans)` to keep chat messages legible.
- **Button Styling:**
  - Hero CTAs must have equal size and shape (`min-width: 170px`, `justify-content: center`).
  - Hover animations: increase gap to `16px` and translate arrow to `translateX(3px)`.
  - Hover colors: `.cta:hover` transitions to transparent bg with `var(--accent)` border and text. `.ctaGhost:hover` transitions to `rgba(168, 85, 247, 0.08)` bg, `var(--accent)` border, and `var(--text)` text.
- **Mobile Responsiveness:**
  - Navigation bar (`.nav`) must be completely hidden (`display: none`) on mobile viewports (`max-width: 720px`).
  - Stacked hero layouts must use soft vertical gradient masks on images (e.g. `linear-gradient(180deg, transparent 0%, black 15%, black 82%, transparent 100%)`) to prevent hard horizontal boundary lines.

### Next.js & React Conventions
- Use the Next.js App Router structure (`app/page.tsx`, `app/layout.tsx`, `app/api/...`).
- Keep components small, modular, and reusable.
- Implement server-side logic in route handlers (`app/api/chat/route.ts`) to securely communicate with OpenRouter.
- Never expose API keys (`OPENROUTER_API_KEY`) on the client side. Use server components or API routes.

### TypeScript Conventions
- Explicitly type all variables, function arguments, and return types.
- Avoid the use of `any`; define interfaces or types for API responses and component props.
- Use optional chaining (`?.`) and nullish coalescing (`??`) safely.
