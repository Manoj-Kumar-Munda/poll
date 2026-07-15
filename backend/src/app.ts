import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

//Security & request optimization middlewares
app.use(helmet());
app.use(cors());
app.use(compression());

//Parsers
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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


app.use(notFoundHandler);
app.use(errorHandler);

export { app };
