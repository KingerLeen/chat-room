import { rooms } from "../content";

export async function DELETE(request: Request, { params }) {
  const { id } = params; // 直接获取动态路由参数
  const index = rooms.findIndex((room) => room.id == id);
  console.log("Deleting room with ID:", id);
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
