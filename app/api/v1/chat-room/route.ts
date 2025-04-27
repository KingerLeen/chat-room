import { randomUUID } from "crypto";
import { WebSocketServer } from "ws";

export const rooms = [
  {
    id: "root",
    name: "大厅",
    canDelete: false,
    description: "这是一个公共聊天室",
  },
];

export async function GET(request: Request) {
  return new Response(JSON.stringify({ code: 0, message: null, data: rooms }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const { name, description } = await request.json();
  const newRoom = {
    id: randomUUID(),
    name,
    canDelete: true,
    description,
  };
  rooms.push(newRoom);
  return new Response(
    JSON.stringify({ code: 0, message: null, data: newRoom }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
