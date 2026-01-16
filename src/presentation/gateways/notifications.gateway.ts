import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { SocketIOWebSocketService } from '@infrastructure/websocket/socket-io-websocket.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly websocketService: SocketIOWebSocketService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // User joins their personal room
  @SubscribeMessage('join')
  handleJoinRoom(@MessageBody() data: { userId: string }, client: Socket) {
    if (data && data.userId) {
      client.join(`user:${data.userId}`);
      console.log(`User ${data.userId} joined room: user:${data.userId}`);
      client.emit('joined', { room: `user:${data.userId}`, userId: data.userId });
    }
  }

  // Initialize websocket service with server instance
  afterInit(server: Server) {
    this.websocketService.setServer(server);
  }
}
