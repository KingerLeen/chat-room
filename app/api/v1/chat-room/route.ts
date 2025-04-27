import { randomUUID } from "crypto";
import { WebSocketServer } from "ws";
import { rooms } from "./content";

export async function GET(request: Request) {
  return new Response(JSON.stringify({ code: 0, message: null, data: rooms }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const { name, description } = await request.json();
  const newRoom: any = {
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
