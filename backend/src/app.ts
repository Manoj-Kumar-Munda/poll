import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from 'better-auth/node';

import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { auth, requireAuth } from './modules/auth/index.js';
import { gameRouter } from './modules/games/index.js';
import { sessionRouter } from './modules/sessions/index.js';
import { participantRouter } from './modules/participants/index.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/games', gameRouter);
app.use('/api/v1', participantRouter);
app.use('/api/v1', sessionRouter);

//Routes
app.get('/health', (req, res) => {
  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: 'Server is healthy',
      data: null,
    })
  );
});

// Protected route returning the currently authenticated host
app.get('/api/v1/me', requireAuth, (req, res) => {
  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: 'Authenticated host retrieved successfully',
      data: {
        host: req.user,
        session: req.session,
      },
    })
  );
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
