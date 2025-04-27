"use client";

import { io } from "socket.io-client";

export const socket = io('/api/v1/chat-room/ws');