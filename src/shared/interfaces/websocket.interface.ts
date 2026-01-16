export interface IWebSocketService {
  emitToUser(userId: string, event: string, data: any): void;
  broadcast(event: string, data: any): void;
}