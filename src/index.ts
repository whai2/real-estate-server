import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import connectToMongoDB from './db/connectToMongoDB';
import { app, server } from './socket/socket';

import authRouter from './routes/auth';
import propertyRouter from './routes/property';
import notificationRouter from './routes/notification';
import communityRouter from './routes/community';
import favoriteRouter from './routes/favorite';
import inquiryRouter from './routes/inquiry';
import uploadRouter from './routes/upload';
import geocodeRouter from './routes/geocode';

import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './swagger';

import './models/Comment'; // Comment 모델 등록

dotenv.config();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/properties', propertyRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/community', communityRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/inquiries', inquiryRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/geocode', geocodeRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  connectToMongoDB();
  console.log(`Server running on port ${PORT}`);
});
