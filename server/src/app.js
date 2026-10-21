import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import accountRoutes from './routes/account.routes.js';
import requirementRoutes from './routes/requirement.routes.js';
import matchRoutes from './routes/match.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Body and cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Profile and Account routes
app.use('/api/profile', profileRoutes);
app.use('/api/account', accountRoutes);

// Requirement routes
app.use('/api/requirements', requirementRoutes);

// Match routes
app.use('/api/matches', matchRoutes);

// Conversation & Chat routes
app.use('/api/conversations', conversationRoutes);


// Central 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
    },
  });
});

// Central error handling middleware
app.use(errorHandler);

export default app;
