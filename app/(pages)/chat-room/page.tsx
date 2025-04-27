"use client";

import { Button, Card, message } from "antd";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

export default function ChatRoom() {
  const router = useRouter();

  const [rooms, setRooms] = useState<any>([]);

  const fetchChatRooms = async () => {
    try {
      const response = await fetch("/api/v1/chat-room");
      const res = await response.json();
      if (res.code === 0) {
        setRooms(res.data);
      }
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    }
  };

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const createRoom = async () => {
    try {
      const response = await fetch("/api/v1/chat-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "New Room",
          description: "This is a new chat room.",
        }),
      });
      const res = await response.json();
      if (res.code === 0) {
        fetchChatRooms();
      }
    } catch (error) {
      console.error("Error creating chat room:", error);
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/v1/chat-room/${roomId}`, {
        method: "DELETE",
      });
      const res = await response.json();
      if (res.code === 0) {
        fetchChatRooms();
      } else {
        res.message && message.warning(res.message);
        console.log(res);
      }
    } catch (error) {
      console.error("Error deleting chat room:", error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div>
        <Button
          onClick={() => {
            createRoom();
          }}
        >
          创建新房间
        </Button>
      </div>
      <div>
        {rooms.map((room) => {
          return (
            <Card
              key={room.id}
              title={room.name}
              style={{ width: 300, margin: "10px" }}
            >
              <p>{room.description}</p>
              <Button
                onClick={() => {
                  // 跳转路由至 /room/${room.id}`}
                  router.push(`/room/${room.id}`);
                }}
                type="primary"
              >
                进入房间
              </Button>

              <Button
                onClick={() => {
                  deleteRoom(room.id);
                }}
                type="primary"
                danger
              >
                删除房间
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
