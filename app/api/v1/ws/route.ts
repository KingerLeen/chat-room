import { WebSocketServer } from "ws";

// 保持WebSocket服务器单例
let wss: WebSocketServer;

interface Client {
  ws: WebSocket;
  userId: string;
  userName: string;
}

const clients = new Map<string, Client>();

// 广播消息给所有客户端（可选排除某个用户）
function broadcast(message: any, excludeUserId?: string) {
  clients.forEach((client) => {
    if (client.userId !== excludeUserId && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

if (!wss) {
  wss = new WebSocketServer({
    port: 3100,
    maxPayload: 1024 * 1024 * 1, // 10MB (默认是 16KB)
    // perMessageDeflate: {
    //   zlibDeflateOptions: {
    //     // See zlib defaults.
    //     chunkSize: 1024,
    //     memLevel: 7,
    //     level: 3
    //   },
    //   zlibInflateOptions: {
    //     chunkSize: 10 * 1024
    //   },
    //   // Other options settable:
    //   clientNoContextTakeover: true, // Defaults to negotiated value.
    //   serverNoContextTakeover: true, // Defaults to negotiated value.
    //   serverMaxWindowBits: 10, // Defaults to negotiated value.
    //   // Below options specified as default values.
    //   concurrencyLimit: 10, // Limits zlib concurrency for perf.
    //   threshold: 1024 // Size (in bytes) below which messages
    //   // should not be compressed if context takeover is disabled.
    // }
  });

  wss.on("connection", (ws, request) => {
    let userId = "";
    let userName = "";

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        // 用户注册
        if (message.type === "register") {
          userId = message.userId;
          userName = message.userName || `User-${userId.substring(0, 4)}`;

          clients.set(userId, { ws, userId, userName });

          // 通知新用户加入
          broadcast({ type: "user-joined", userId, userName }, userId);

          // 发送当前在线用户列表给新用户
          const userList = Array.from(clients.values())
            .filter((client) => client.userId !== userId)
            .map((client) => client.userId);
          ws.send(JSON.stringify({ type: "user-list", users: userList }));
        }
        // 转发消息
        else if (message.type === "message") {
          broadcast({
            type: "message",
            sender: userName,
            message: message.message,
          });
        }
        // 转发WebRTC信令
        else if (["offer", "answer", "candidate"].includes(message.type)) {
          const targetClient = clients.get(message.userId);
          if (targetClient && targetClient.ws.readyState === 1) {
            targetClient.ws.send(
              JSON.stringify({
                ...message,
                senderId: userId, // 添加发送者ID
              })
            );
          }
        }
        // 通知流准备就绪
        else if (message.type === "stream-ready") {
          broadcast(
            { type: "stream-ready", userId: message.userId },
            message.userId
          );
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on("close", () => {
      if (userId) {
        clients.delete(userId);
        // 通知其他用户该用户已离开
        broadcast({ type: "user-left", userId });

        // 发送当前在线用户列表给新用户
        const userList = Array.from(clients.values())
          .filter((client) => client.userId !== userId)
          .map((client) => client.userId);
        ws.send(JSON.stringify({ type: "user-list", users: userList }));
      }
    });
  });
  console.log("WebSocket server is running on ws://localhost:333");
}

export async function GET(request: Request) {
  return new Response(JSON.stringify({ code: 0, message: null }), {
    headers: { "Content-Type": "application/json" },
  });
}
