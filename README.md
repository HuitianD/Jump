# Jump Game

A 2D browser-based platform jumping game built for the **David Levari Lab**, Department of Cognitive and Psychological Sciences, Brown University. Players hold and release to charge a jump and land a character on platforms across 30 trials. Timing data for each trial is automatically saved to a MongoDB database for research analysis.

---

## Features

- **30-trial experiment** split into three difficulty phases
- **Charge-based jump mechanic** — hold to build power, release to launch
- **Squash-and-stretch animations** with spring physics on landing
- **Automatic data collection** — per-trial timestamps, landing coordinates, and outcomes saved to MongoDB
- **Replay viewer** — watch any past session played back at 0.5×, 1×, 2×, or 3× speed with live stats
- **Participant ID entry** before each session for data labeling
- **Pause / Restart** controls during gameplay
- **Touch support** — works on touchscreens as well as mouse/trackpad

---

## Difficulty Phases

| Phase | Trials | Platform Width | Target Movement |
|-------|--------|---------------|-----------------|
| Easy  | 1–10   | 120–140 px    | Static          |
| Hard  | 11–20  | 50–80 px      | Static          |
| Moving | 21–30 | 50–80 px      | Oscillates vertically |

---

## Key Functions
Game (`jump1.html`)
Replay Viewer (`replay.html`)
Server (`server.js`)


## How to Play

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — create a `.env` file in the project root:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
   PORT=3000
   ALLOWED_ORIGIN=http://localhost:3000
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   The server starts at `http://localhost:3000`.

4. **Open the game** in your browser:
   ```
   http://localhost:3000/jump1.html
   ```

### Playing

1. Enter a **Participant ID** (e.g. `P042`) and click **Start**.
2. **Hold** the mouse button (or press and hold on a touchscreen) to charge the jump — the character squashes as power builds.
3. **Release** to launch. The jump angle is fixed at ~60° upward-right; power depends on how long you held.
4. Land the character **on top of the target platform** to score a success. Missing the platform (falling off-screen) counts as a failure.
5. Repeat for all **30 trials**. After the final trial the session is automatically saved and a session ID is shown.

**Controls during a session:**
- **Pause / Resume** — temporarily freeze the game mid-trial
- **Restart** — discard the current session and return to the ID entry screen

---

## Replay

1. Open the replay viewer at:
   ```
   http://localhost:3000/replay.html
   ```
2. Optionally type a **Participant ID** and click **Search** to filter sessions, or click **Show All**.
3. Select a session from the dropdown and click **Load & Watch**.
4. Use the **Speed** slider to set playback speed (0.5×, 1×, 2×, 3×).
5. Click **Play** to start the replay. Use **Pause** and **Restart** to control playback.

The replay panel also shows a summary of the session: number of successes, failures, average reaction time (landing → press), and average charge time (press → release).

---

## Tech Stack

- **Frontend** — Vanilla HTML5 Canvas, JavaScript (no framework)
- **Backend** — Node.js, Express
- **Database** — MongoDB via Mongoose
- **Dev server** — Nodemon (`npm run dev`)
