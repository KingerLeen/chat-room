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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params; // 直接获取动态路由参数
  const index = rooms.findIndex((room) => room.id === id);
  if (index !== -1) {
    if (rooms[index].canDelete) {
      rooms.splice(index, 1);
      return new Response(JSON.stringify({ code: 0, message: null }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ code: 1, message: "Room cannot be deleted" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } else {
    return new Response(
      JSON.stringify({ code: 1, message: "Room not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
