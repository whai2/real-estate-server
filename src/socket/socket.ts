import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const userSocketMap: Record<string, string> = {};

export const getReceiverSocketId = (receiverId: string) => {
  return userSocketMap[receiverId];
};

export const getReceiverSocketIds = (receiverIds: string[]) => {
  return receiverIds
    .map((receiverId) => userSocketMap[receiverId])
    .filter((socketId) => socketId);
};

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  const userId = socket.handshake.query.userId as string;

  if (userId !== 'undefined') userSocketMap[userId] = socket.id;

  socket.on('register', (uid: string) => {
    socket.join(`user:${uid}`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    delete userSocketMap[userId];
  });
});

export { app, io, server };
