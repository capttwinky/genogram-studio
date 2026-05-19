# Genogram Studio

[![Deploy to GitHub Pages](https://github.com/capttwinky/genogram-studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/capttwinky/genogram-studio/actions/workflows/deploy.yml)

A single-page React app for creating and rendering genogram-style family and system diagrams from JSON embedded in Markdown.

The app extracts a fenced `genogram-json` block from Markdown, validates it with Zod, normalizes references into an internal graph model, computes a deterministic SVG layout, and renders an interactive diagram with D3.

## Tech Stack

- React
- TypeScript
- Vite
- D3
- Zod
- Plain CSS
- Local browser state only

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev -- --port 5173
```

Open:

```text
http://localhost:5173/
```

Build for production:

```bash
npm run build
```

Build for a GitHub Pages project page:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

## Markdown Format

Paste Markdown that contains a fenced JSON block:

````markdown
```genogram-json
{
  "people": [
    {
      "id": "p_joel",
      "name": "Joel",
      "gender": "male",
      "birthYear": 1979
    }
  ],
  "unions": [],
  "parentChildLinks": [],
  "emotionalRelationships": [],
  "roles": [],
  "roleAssignments": []
}
```
````

If no `genogram-json` or `json` fence is found, the app attempts to parse the full editor contents as JSON.

## Supported Data

The current schema supports:

- `people`
- `unions`
- `parentChildLinks`
- `emotionalRelationships`
- `roles`
- `roleAssignments`

Validation catches malformed JSON, schema errors, duplicate ids, and references to missing people, unions, or roles.

## Diagram Features

- SVG rendering with D3
- Zoom and pan
- Draggable person and union nodes
- Gender-based genogram symbols
- Parent-child and partner/union links
- Emotional relationship lines with distinct styles
- Role badges on people
- Editor state persisted in `localStorage`

## Project Structure

```text
.github/
  workflows/
    deploy.yml
src/
  App.tsx
  components/
    GenogramSvg.tsx
  diagram/
    layout.ts
  domain/
    markdown.ts
    normalize.ts
    parse.ts
    schema.ts
  sample.ts
  styles.css
```

## GitHub Pages Deployment

This project uses GitHub Pages Actions to build the Vite app and publish the generated `dist/` artifact. It is not a Jekyll project, it does not use the "Static HTML without build" workflow, it does not use a `gh-pages` branch, and `dist/` should stay uncommitted.

### Enable GitHub Pages

In the GitHub repository:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to the `main` branch, or run the workflow manually from the **Actions** tab.

### Deploy Workflow

The workflow at `.github/workflows/deploy.yml`:

- runs on pushes to `main`
- supports manual `workflow_dispatch`
- installs dependencies with `npm ci`
- builds with `npm run build`
- uploads `dist/` as a GitHub Pages artifact
- deploys with `actions/deploy-pages`
- includes `public/.nojekyll` so GitHub Pages does not run Jekyll processing
- uses only these permissions: `contents: read`, `pages: write`, `id-token: write`

### Base Path

Vite reads the public base path from `VITE_BASE_PATH` in `vite.config.ts`.

For local development, no variable is needed:

```bash
npm run dev
```

For a user or organization root page, such as `https://USERNAME.github.io/`, use:

```bash
VITE_BASE_PATH=/ npm run build
```

For this repository's project page, `https://USERNAME.github.io/genogram-studio/`, the base path should be:

```bash
VITE_BASE_PATH=/genogram-studio/ npm run build
```

The deploy workflow defaults `VITE_BASE_PATH` to `/${repo-name}/`, which resolves to `/genogram-studio/` for this repository. To override it, add a repository variable named `VITE_BASE_PATH` in **Settings > Secrets and variables > Actions > Variables**. Set it to `/` for a user or organization root page.
