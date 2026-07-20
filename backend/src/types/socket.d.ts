import "socket.io";

declare module "socket.io" {
  interface Socket {
    data: {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    };
  }
}
