# Solis AppV2 Project Context

## Purpose

Solis AppV2 is a desktop Electron application. This repository is the source of truth for the current implementation.

The initial baseline is intentionally small and is built around:

- Electron main process
- Secure preload IPC
- React renderer
- Vite
- Tailwind CSS
- Framer Motion
- electron-builder
- electron-updater
- GitHub Releases

## Current State

Project phase: initial Electron boilerplate.

Repository: `solis-syst/solis-appv2`

Default branch: `main`

Initial application version: `1.0.0`

Distribution targets:

- Windows x64 NSIS installer
- macOS DMG and ZIP for x64 and arm64
- Linux x64 AppImage

Update provider:

- GitHub Releases
- owner: `solis-syst`
- repository: `solis-appv2`
- provider: `github`

## Architecture

### Main process

`main.js`

Responsibilities:

- Create the Electron window.
- Enforce `contextIsolation: true`.
- Enforce `nodeIntegration: false`.
- Use Electron sandboxing for the renderer.
- Load the Vite development URL in development.
- Load `dist/renderer/index.html` in production.
- Register updater events.
- Invoke `autoUpdater.checkForUpdates()`.
- Download updates only after renderer action.
- Install downloaded updates through `quitAndInstall()`.
- Relay updater events through a single `updater:event` IPC channel.
- Expose version and development-mode IPC handlers.
- Provide development-only mock updater events.

### Preload

`preload.js`

Only exposes a narrow API through `contextBridge`:

- `app.getVersion()`
- `app.isDevelopment()`
- `updater.check()`
- `updater.download()`
- `updater.install()`
- `updater.onEvent(callback)`
- `updater.mock(type, data)`

Do not expose `ipcRenderer`, `process`, `require`, filesystem APIs, or arbitrary IPC channels to the renderer.

### Renderer

`src/App.jsx`

Owns the current updater state.

`src/components/UpdaterCard.jsx`

Renders the Update Center.

Updater states:

- idle
- checking
- available
- downloading
- downloaded
- not-available
- development
- error

### Styling

`src/index.css`

Uses Tailwind CSS v4 with a restrained zinc-based palette. The active update accent is emerald. Avoid gradients, glassmorphism, excessive rounded pills, decorative glows, and unnecessary visual noise.

Use monospaced/tabular numeric presentation for:

- versions
- percentages
- transfer sizes
- download speeds

## Update Flow

### Startup

In packaged builds:

1. Electron starts.
2. The main process creates the window.
3. After a short delay, `autoUpdater.checkForUpdates()` runs.
4. The main process receives the updater result.
5. The main process relays it through `updater:event`.
6. React updates the Update Center.

### Manual check

Renderer -> preload -> main:

`updater.check()`

In development this does not contact GitHub. It emits a development state instead.

### Download

The renderer requests:

`updater.download()`

The main process calls:

`autoUpdater.downloadUpdate()`

Progress is relayed continuously through:

`download-progress`

### Apply

After `update-downloaded`, the renderer exposes:

`Restart to apply`

That invokes `updater.install()`, which calls:

`autoUpdater.quitAndInstall(false, true)`

## Release Pipeline

The workflow is:

`.github/workflows/release.yml`

Automatic trigger:

`push.tags: v*.*.*`

Manual trigger:

`workflow_dispatch`

The manual workflow exposes a required `tag` input in the GitHub Actions UI.

Example:

`v1.0.0`

The manually selected tag is checked out directly before building.

Each release build runs on:

- windows-latest
- macos-latest
- ubuntu-latest

GitHub Actions uses:

`GH_TOKEN=${{ secrets.GITHUB_TOKEN }}`

The workflow runs:

`npm install --no-audit --no-fund`

then:

`npm run release`

electron-builder publishes the generated platform installers and updater metadata to the GitHub Release.

### Required release versioning

Before tagging a release, `package.json` must contain the same semantic version as the tag without the leading `v`.

Example:

`package.json` -> `1.0.1`

Git tag:

`v1.0.1`

Do not create a `v1.0.1` tag while `package.json` still says `1.0.0`.

### Manual release procedure

1. Open the repository's **Actions** tab.
2. Select **Release**.
3. Select **Run workflow**.
4. Enter an existing tag such as `v1.0.0`.
5. Start the workflow.
6. The matrix builds Windows, macOS, and Linux from that exact tag.
7. The existing `GITHUB_TOKEN` publishes the build artifacts to the corresponding GitHub Release.

The manual tag input is validated against the `vMAJOR.MINOR.PATCH` format before the build starts.

## Update Metadata

electron-builder generates platform-specific updater metadata as part of publishing.

For Windows NSIS, the release must contain `latest.yml` alongside the installer artifacts.

For macOS, the relevant metadata is generated for the configured macOS targets.

For Linux AppImage, the relevant metadata is generated for AppImage updates.

Never manually create updater metadata unless there is a specific verified reason to do so.

## Local Development

Install dependencies:

`npm install`

Run the desktop app with Vite:

`npm run dev`

Run the packaged entry directly:

`npm start`

The development script starts Vite first, waits for port 5173, then launches Electron with:

`VITE_DEV_SERVER_URL=http://127.0.0.1:5173`

## Local Updater Simulation

The development build exposes a non-production simulation path through the Update Center.

Use the Update Center's "Development state simulation" controls to exercise:

- Update available
- Download progress
- Downloaded
- Error
- Up to date

The preload API also supports:

`window.electronAPI.updater.mock(type, data)`

Production builds reject mock events.

## Testing a Real Update

### Release 1.0.0

1. Set `package.json` to `1.0.0`.
2. Commit the change.
3. Create and push tag `v1.0.0`.
4. Wait for the three GitHub Actions matrix jobs.
5. Confirm the GitHub Release contains the platform installers and generated updater metadata.
6. Install the Windows NSIS build for the Windows update test.

### Release 1.0.1

1. Change `package.json` from `1.0.0` to `1.0.1`.
2. Commit the change.
3. Create and push tag `v1.0.1`.
4. Wait for the GitHub Actions release workflow.
5. Confirm the `v1.0.1` GitHub Release is published and contains `latest.yml` plus the Windows installer.
6. Launch the installed `1.0.0` application.
7. Let startup checking run or press "Check for updates".
8. The UI should move from checking -> update available.
9. Press "Download update".
10. Verify progress events update the percentage, transferred size, total size, and MB/s rate.
11. When download completes, verify the UI changes to "Ready to restart".
12. Press "Restart to apply".
13. After restart, verify the application version is `1.0.1`.

## Important Platform Constraint

Unsigned macOS builds can be produced by GitHub Actions, but a production macOS auto-update distribution should use a valid Apple Developer signing and notarization setup.

Do not add signing secrets or certificates to this repository. Configure them through GitHub Actions secrets when macOS release signing is required.

## Security Rules

Keep these invariants intact:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- No raw `ipcRenderer` exposed to React.
- No Node.js filesystem access exposed to React.
- No arbitrary IPC channel names supplied by renderer input.
- Mock updater events remain development-only.
- External window creation is denied.
- Renderer navigation is denied.
- Session permission requests are denied by default.

Any future IPC feature should expose a specific typed operation through the preload bridge instead of exposing general Electron primitives.

## UI Rules

Preserve the existing visual direction unless a redesign is explicitly requested:

- desktop-native
- neutral zinc/slate surfaces
- one restrained active accent
- compact typography
- clear hierarchy
- tabular numbers
- subtle transitions
- no decorative gradients
- no glassmorphism
- no glowing borders
- no excessive pills
- no busy background decoration

## Change Discipline For Future AI Sessions

Before changing code:

1. Read this file.
2. Inspect the existing implementation.
3. Identify what currently works.
4. Make the smallest change that satisfies the request.
5. Do not refactor unrelated code.
6. Do not rename existing APIs without a concrete reason.
7. Do not introduce dependencies unless explicitly requested.
8. Preserve security invariants.
9. After making a change, update this file's Current State or Change Log when the architecture, behavior, or release process changes.

Never treat old assumptions from a previous conversation as more authoritative than the current repository contents.

## Change Log

### 2026-09-28

- Initialized the Solis AppV2 Electron project.
- Added React + Vite renderer.
- Added Tailwind CSS v4.
- Added Framer Motion.
- Added secure Electron preload IPC.
- Added electron-updater integration with the complete updater event lifecycle.
- Added development-only updater state simulation.
- Added electron-builder GitHub publishing configuration.
- Added Windows NSIS, macOS DMG/ZIP, and Linux AppImage targets.
- Added tag-triggered GitHub Actions release matrix.
- Added manual workflow dispatch with tag input and exact-tag checkout.
- Added this project context file for future AI sessions.

## Known Limitations

- No application-specific Solis features have been implemented yet.
- No persistent local database is configured.
- No authentication system is configured.
- macOS production auto-updates require signed/notarized builds.
- Release artifacts depend on successful GitHub Actions publishing.
- A complete package lockfile has not been added to this initial repository baseline.
