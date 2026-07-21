import "socket.io";

declare module "socket.io" {
  interface Socket {
    data: {
      host?: {
        id: string;
        email: string;
        name: string;
      };
      user?: {
        id: string;
        email: string;
        name: string;
      };
      sessionId?: string;
      participantId?: string;
    };
  }
}
