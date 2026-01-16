import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { IWebSocketService } from '@shared/interfaces/websocket.interface';

@Injectable()
export class SocketIOWebSocketService implements IWebSocketService {
  private server: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, data: any): void {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }

  broadcast(event: string, data: any): void {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}
