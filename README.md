# Slash / MCP – Proof-of-Concept Client

A React + Tailwind POC for the **Model Context Protocol (MCP)**. Quickly connect to a mock MCP server, exchange resources (text, images, binaries), invoke tools, and toggle light/dark themes with a slick UI.

## ✨ Features

• JSON-RPC 2.0 client with in-browser **mock server** (no backend needed).  
• Upload text, images (PNG/JPEG/GIF), or any binary file.  
• Hover previews for images in the sidebar and chat.  
• Quick-action tiles: Upload, Screenshot (placeholder), Text Resource, Code Analysis.  
• Light/Dark mode with back-glow effect.  
• Fully typed hooks & resource serialization helpers.  
• CI pipeline with lint, unit tests (Vitest), **Puppeteer smoke test**.

## 🚀 Quick start (development)

```bash
npm install          # install deps
npm run dev          # vite dev server → http://localhost:5173
```

## 🏗️ Production build & smoke test locally

```bash
npm run build        # generates ./dist
npm run smoke        # spins up static server on :5000 and runs Puppeteer smoke test
```

## 📦 Scripts

| Command           | Purpose                                     |
|-------------------|---------------------------------------------|
| `npm run dev`     | Vite dev server with HMR                    |
| `npm run lint`    | ESLint over the whole repo                  |
| `npm run test`    | Vitest unit tests                           |
| `npm run build`   | Production build                            |
| `npm run smoke`   | Build-agnostic Puppeteer smoke test         |

## 🔄 GitHub Actions CI

`.github/workflows/ci.yml` triggers on **push** & **PR** to `main`:
1. `npm ci` + lint + unit tests  
2. `vite build`  
3. Serves `dist` on port 5000  
4. Runs the smoke test (same as `npm run smoke`)

## 📝 Roadmap

- Implement real MCP websocket connection.  
- Finish "Screenshot" quick action.  
- Error boundary & edge-case UX polish.  
- Drag-and-drop upload.  
- Storybook for component docs.

---
Developed by **automationalien.com** – June 2025 