require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===== Middleware =====
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== Mongoose Schemas =====
const TrialSchema = new mongoose.Schema({
  trial: { type: Number },
  landingTimestamp: { type: Number, default: null },
  pressTimestamp: { type: Number, default: null },
  jumpTimestamp: { type: Number, default: null },
  landingToPressMs: { type: Number, default: null },
  pressToJumpMs: { type: Number, default: null },
  postLandingTimestamp: { type: Number, default: null },
  targetPlatformWidth: { type: Number, default: null },
  targetPlatformHeight: { type: Number, default: null },
  startX: { type: Number, default: null },
  startY: { type: Number, default: null },
  landingX: { type: Number, default: null },
  landingY: { type: Number, default: null },
  outcome: { type: String, enum: ['success', 'failure', null], default: null },
});

const SessionSchema = new mongoose.Schema({
  participantId: { type: String, default: '' },
  submittedAt: { type: Date, required: true },
  savedAt: { type: Date, default: Date.now },
  successCount: { type: Number, required: true },
  failureCount: { type: Number, required: true },
  totalTrials: { type: Number, required: true },
  successRate: { type: Number, required: true },
  trials: [TrialSchema],
});

const Session = mongoose.model('Session', SessionSchema);

// ===== Routes =====

// POST /api/save-results
app.post('/api/save-results', async (req, res) => {
  const { participantId, submittedAt, successCount, failureCount, totalTrials, successRate, trials } = req.body;

  if (
    submittedAt === undefined ||
    successCount === undefined ||
    failureCount === undefined ||
    totalTrials === undefined ||
    successRate === undefined
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const session = new Session({
      participantId: participantId || '',
      submittedAt: new Date(submittedAt),
      successCount,
      failureCount,
      totalTrials,
      successRate,
      trials: trials || [],
    });

    await session.save();
    return res.status(201).json({ status: 'ok', sessionId: session._id });
  } catch (err) {
    console.error('Error saving session:', err);
    return res.status(500).json({ error: 'Failed to save results' });
  }
});

// GET /api/results/:id
app.get('/api/results/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    return res.json(session);
  } catch (err) {
    console.error('Error fetching session:', err);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// GET /api/results
app.get('/api/results', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ savedAt: -1 });
    return res.json(sessions);
  } catch (err) {
    console.error('Error fetching results:', err);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// ===== Connect to MongoDB and Start Server =====
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Please create a .env file from .env.example.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Game available at http://localhost:${PORT}/jump1.html`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
