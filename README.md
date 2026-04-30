# Arcade

A simple game hub built with React, deployable to GitHub Pages.

## Setup

```bash
npm install
npm start
```

## Deploy to GitHub Pages

1. **Add your repo URL** to `package.json`:
   ```json
   "homepage": "https://<your-username>.github.io/<repo-name>"
   ```

2. **Install gh-pages** (already in devDependencies):
   ```bash
   npm install
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```
   This builds the app and pushes to the `gh-pages` branch automatically.

4. In your GitHub repo → **Settings → Pages**, set source to the `gh-pages` branch.

## Adding Your Flappy Bird Game

Open `src/pages/FlappyBird.js` and replace the `<div className="fb-canvas-area">` placeholder with your game component or canvas logic.

The page already has a **← BACK** button wired up to return to the home screen.

## Adding More Games

1. Create `src/pages/YourGame.js`
2. Add a route in `App.js`:
   ```jsx
   {page === 'your-game' && <YourGame navigate={navigate} />}
   ```
3. Update the `GAMES` array in `Home.js` — change `status: 'soon'` to `status: 'play'` and set the correct `id`.

## Project Structure

```
src/
  App.js          # Hash-based router
  App.css         # Global styles & CSS variables
  pages/
    Home.js       # Game hub / landing page
    Home.css
    FlappyBird.js # Flappy Bird page (add your game here)
    FlappyBird.css
```
