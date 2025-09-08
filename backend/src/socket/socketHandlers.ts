import { Server, Socket } from 'socket.io';

interface SocketData {
  jobId?: string;
  userId?: string;
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Handle joining job rooms
    socket.on('join:job', (jobId: string) => {
      socket.join(jobId);
      console.log(`📝 Client ${socket.id} joined job room: ${jobId}`);
      
      socket.emit('joined:job', { jobId, message: 'Successfully joined job room' });
    });
    
    // Handle leaving job rooms
    socket.on('leave:job', (jobId: string) => {
      socket.leave(jobId);
      console.log(`📝 Client ${socket.id} left job room: ${jobId}`);
    });
    
    // Handle test events
    socket.on('test', (data: any) => {
      console.log(`🧪 Test event received from ${socket.id}:`, data);
      socket.emit('test:response', { 
        message: 'Test successful', 
        timestamp: new Date().toISOString(),
        clientId: socket.id 
      });
    });
    
    // Handle utility-specific events
    socket.on('document-fetcher:start', (data: any) => {
      console.log(`📄 Document fetcher started:`, data);
      socket.to(data.jobId).emit('document-fetcher:start', data);
    });
    
    socket.on('file-converter:start', (data: any) => {
      console.log(`🔄 File converter started:`, data);
      socket.to(data.jobId).emit('file-converter:start', data);
    });
    
    socket.on('qr-code:start', (data: any) => {
      console.log(`🔲 QR code generator started:`, data);
      socket.to(data.jobId).emit('qr-code:start', data);
    });
    
    socket.on('password-generator:start', (data: any) => {
      console.log(`🔐 Password generator started:`, data);
      socket.to(data.jobId).emit('password-generator:start', data);
    });
    
    socket.on('image-resizer:start', (data: any) => {
      console.log(`🖼️ Image resizer started:`, data);
      socket.to(data.jobId).emit('image-resizer:start', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    
    // Handle connection errors
    socket.on('connect_error', (error: Error) => {
      console.error(`❌ Connection error for ${socket.id}:`, error.message);
    });
  });
  
  // Broadcast server status periodically
  setInterval(() => {
    const connectedClients = io.engine.clientsCount;
    io.emit('server:status', {
      connectedClients,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }, 30000); // Every 30 seconds
}

// Utility function to emit progress updates
export function emitProgress(
  io: Server, 
  jobId: string, 
  event: string, 
  data: any
): void {
  io.to(jobId).emit(event, data);
  io.emit(event, data); // Also emit to all clients as fallback
}

// Utility function to emit completion
export function emitCompletion(
  io: Server, 
  jobId: string, 
  event: string, 
  data: any
): void {
  io.to(jobId).emit(event, data);
  io.emit(event, data); // Also emit to all clients as fallback
}

// Utility function to emit errors
export function emitError(
  io: Server, 
  jobId: string, 
  event: string, 
  error: any
): void {
  const errorData = {
    jobId,
    error: error.message || error,
    timestamp: new Date().toISOString()
  };
  
  io.to(jobId).emit(event, errorData);
  io.emit(event, errorData); // Also emit to all clients as fallback
}
