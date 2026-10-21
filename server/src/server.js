import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import config from './config/index.js';
import registerChatSocket from './sockets/chat.socket.js';

const server = http.createServer(app);

// Configure Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientUrl,
    credentials: true,
  },
});

// Attach chat Socket.IO handlers
registerChatSocket(io);

const PORT = config.port;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 RoomieMatch server running on port ${PORT} [${config.nodeEnv}]`);
  });
}

export { server, io };
