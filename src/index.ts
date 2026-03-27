import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

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
import openSiteRouter from './routes/openSite';
import dashboardRouter from './routes/dashboard';
import propertyGroupRouter from './routes/propertyGroup';
import formatRouter from './routes/format';
import purchaseRouter from './routes/purchase';
import autoNotificationRouter from './routes/autoNotification';
import settingsRouter from './routes/settings';

import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './swagger';
import { startAutoHideScheduler } from './jobs/autoHideScheduler';

import './models/Comment'; // Comment 모델 등록

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(helmet());
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
app.use('/api/open-sites', openSiteRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/property-groups', propertyGroupRouter);
app.use('/api/formats', formatRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/auto-notifications', autoNotificationRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  connectToMongoDB();
  startAutoHideScheduler();
  console.log(`Server running on port ${PORT}`);
});
