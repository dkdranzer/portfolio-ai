# Dinesh Kumar G — Neural Portfolio

A scroll-driven portfolio told as one inference pass of a model. A single
particle field morphs through seven stages:

| Step | Scene | Section |
| --- | --- | --- |
| 00 Prompt | Starfield + terminal typing the prompt | Name, headline |
| 01 Embedding | Coloured embedding clusters | About + **temperature slider** |
| 02 Network | Layered neural network with travelling signals | Skills + **attention view** |
| 03 Training data | Brain with flowing synapse pulses | Education, certifications |
| 04 Fine-tuning | Loss landscape with a gradient-descent ball | Experience as epochs |
| 05 Core | Robot with an energy core projecting a hologram | Projects |
| 06 Output | Pulsing orb | Contact |

Stack: **Next.js + React, Three.js, GSAP + ScrollTrigger, Lenis**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## Edit content

Everything is in **`src/content/profile.ts`**:

- `bios` — the three temperature levels (factual → personal).
- `skills` — `w` sets how brightly a skill glows.
- `projects[].uses` — which skills each project used. This drives the attention lines.
- `epochs` — the fine-tuning timeline and its loss values.

## Deploy

Push to GitHub and import the repo on https://vercel.com — no config needed.

## Where things live

| File | What it does |
| --- | --- |
| `src/content/profile.ts` | All text content |
| `src/lib/neuralScene.ts` | The Three.js particle field, stage shapes, camera |
| `src/components/NeuralPortfolio.tsx` | Sections, temperature slider, attention view, loss chart |
| `src/app/globals.css` | Styling |
