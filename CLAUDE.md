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

### Styling & Theme (Purple Theme)
- Use custom CSS variables or a unified theme for purple colors:
  - Dark mode backgrounds: Deep purple/indigo blacks (`#0B0813`, `#120E25`)
  - Accent colors: Vibrant purples/violets (`#8B5CF6`, `#A78BFA`)
  - Text colors: High contrast soft whites and lavender grays (`#F3F4F6`, `#E9D5FF`)
- Favor smooth transitions, gradients, and glassmorphism styling (`backdrop-filter`).

### Next.js & React Conventions
- Use the Next.js App Router structure (`app/page.tsx`, `app/layout.tsx`, `app/api/...`).
- Keep components small, modular, and reusable.
- Implement server-side logic in route handlers (`app/api/chat/route.ts`) to securely communicate with OpenRouter.
- Never expose API keys (`OPENROUTER_API_KEY`) on the client side. Use server components or API routes.

### TypeScript Conventions
- Explicitly type all variables, function arguments, and return types.
- Avoid the use of `any`; define interfaces or types for API responses and component props.
- Use optional chaining (`?.`) and nullish coalescing (`??`) safely.
