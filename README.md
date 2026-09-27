# Solis AppV2

Solis AppV2 is a minimal Electron desktop application foundation with a React + Vite renderer, Tailwind CSS, secure IPC, Framer Motion, and GitHub Releases auto-updates.

## Requirements

- Node.js 22.12+
- npm

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Production build

\`\`\`bash
npm run build
\`\`\`

Build output is written to \`release/\`.

## Releases

Update the version in \`package.json\`, commit it, and push a semantic version tag:

\`\`\`bash
git tag v1.0.0
git push origin v1.0.0
\`\`\`

GitHub Actions builds Windows, macOS, and Linux artifacts and publishes them to the GitHub Release.

See [project.md](./project.md) for architecture, update-flow details, release testing, security invariants, and the project change log.
