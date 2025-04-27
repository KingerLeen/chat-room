"use client";

import { Button, Input, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { generateUUID } from "../../../utils/uuid";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.voipbuster.com" },
    { urls: "stun:stun.sipgate.net" },
  ],
};

type PeerConnectionMap = {
  [key: string]: RTCPeerConnection;
};

type PeerStreamMap = {
  [key: string]: MediaStream;
};

export default function VideoChatRoom() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [userName, setUserName] = useState<string>(generateUUID());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<PeerStreamMap>({});
  const [peerId, setPeerId] = useState(generateUUID());
  const [peers, setPeers] = useState<string[]>([]);
  const [status, setStatus] = useState("Disconnected");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement | null }>(
    {}
  );
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<PeerConnectionMap>({});

  // 初始化本地视频流
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 先创建所有peer连接
      peers.forEach((id) => {
        if (id !== peerId) {
          createPeerConnection(id);
        }
      });

      // 最后再通知其他用户
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "stream-ready", userId: peerId })
        );
      }
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  // 关闭本地视频流
  const closeLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setStatus("Disconnected");
    }
  };

  // 创建与特定peer的连接
  const createPeerConnection = (_peerId: string) => {
    // if (!localStream) {
    //   console.error("No local stream available");
    //   return;
    // }
    if (peerConnectionsRef.current[_peerId]) {
      console.log(`Connection to ${_peerId} already exists`);
      return;
    }

    const pc = new RTCPeerConnection(configuration);
    peerConnectionsRef.current[_peerId] = pc;
    console.log(`Creating peer connection to ${_peerId}`, pc);

    // 添加本地轨道
    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "candidate",
            userId: _peerId,
            candidate: event.candidate,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      setPeerStreams((prev) => ({
        ...prev,
        [_peerId]: event.streams[0],
      }));
    };

    // 创建 offer
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (
          wsRef.current?.readyState === WebSocket.OPEN &&
          pc.localDescription
        ) {
          console.log("发送offer", { _peerId });
          wsRef.current.send(
            JSON.stringify({
              type: "offer",
              userId: _peerId,
              offer: pc.localDescription,
            })
          );
        }
      })
      .catch(console.error);
    return pc;
  };

  // 处理收到的offer
  const handleOffer = async (
    _peerId: string,
    offer: RTCSessionDescriptionInit
  ) => {
    console.log("handleOffer", { _peerId, offer });
    if (_peerId === peerId) {
      console.log("自己不能处理自己的offer");
      return;
    }
    let pc = peerConnectionsRef.current[_peerId];
    if (!pc) {
      pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current[_peerId] = pc;
      console.log(`Creating peer connection to ${_peerId}`, pc);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "candidate",
            userId: _peerId,
            candidate: event.candidate,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      setPeerStreams((prev) => ({
        ...prev,
        [_peerId]: event.streams[0],
      }));
    };

    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "answer",
          userId: _peerId,
          answer: pc.localDescription,
        })
      );
    }
  };

  // 处理收到的answer
  const handleAnswer = async (
    _peerId: string,
    answer: RTCSessionDescriptionInit
  ) => {
    const pc = peerConnectionsRef.current[_peerId];
    if (!pc) {
      console.error("No peer connection for answer");
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  // 处理收到的ICE candidate
  const handleCandidate = async (
    _peerId: string,
    candidate: RTCIceCandidateInit
  ) => {
    const pc = peerConnectionsRef.current[_peerId];
    if (!pc) {
      console.error("No peer connection for candidate");
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // 移除peer连接
  const removePeerConnection = (_peerId: string) => {
    const pc = peerConnectionsRef.current[_peerId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[_peerId];
    }

    setPeerStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[_peerId];
      return newStreams;
    });
  };

  // 发送聊天消息
  const sendChatMessage = () => {
    if (input.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "message", message: input, sender: userName })
      );
      setInput("");
    }
  };

  // 初始化WebSocket连接
  const connectWebSocket = async () => {
    try {
      console.log("Connecting to WebSocket...");

      // 先请求API路由初始化WebSocket服务器
      await fetch("/api/v1/ws");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//localhost:333`;

      // const peerId = ;
      // setPeerId(peerId);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // 处理聊天消息
        if (data.type === "message") {
          setMessages((prev) => [...prev, `${data.sender}: ${data.message}`]);
        }
        // 处理新用户加入
        else if (data.type === "user-joined") {
          setPeers((prev) => [...prev, data.userId]);
          message.info(`${data.userId} 加入了聊天室`);
        }
        // 处理新用户加入
        else if (data.type === "user-list") {
          setPeers([...data.users].filter((id) => id !== peerId));
        }
        // 处理用户离开
        else if (data.type === "user-left") {
          setPeers((prev) => prev.filter((id) => id !== data.userId));
          removePeerConnection(data.userId);
          message.info(`${data.userId} 离开了聊天室`);
        } else if (data.type === "stream-ready") {
          // 只有当本地有流时才创建连接
          console.log("stream-ready", data);
          // if (localStream) {
          createPeerConnection(data.userId);
          // }
        }
        // 处理WebRTC信令
        else if (data.type === "offer") {
          console.log("收到offer", data);
          await handleOffer(data.senderId, data.offer);
        } else if (data.type === "answer") {
          await handleAnswer(data.userId, data.answer);
        } else if (data.type === "candidate") {
          await handleCandidate(data.userId, data.candidate);
        }
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "register", userId: peerId, userName }));
        setStatus("Connected to signaling server");
        setMessages((prev) => [...prev, "已连接到聊天室"]);
      };

      ws.onclose = () => {
        setStatus("Disconnected");
        setMessages((prev) => [...prev, "连接已关闭"]);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        message.error("WebSocket连接错误");
      };
    } catch (err) {
      console.error("Connection error:", err);
      message.error("连接服务器失败");
    }
  };

  useEffect(() => {
    // 连接WebSocket
    connectWebSocket();

    return () => {
      console.log("Cleaning up resources...");
      // 清理资源
      wsRef.current?.close();
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  console.log("peerStreams", peerStreams);
  console.log("peers", peers);
  console.log("peerConnectionsRef", peerConnectionsRef.current);
  console.log("remoteVideosRef", remoteVideosRef.current);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">视频聊天室</h1>

      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="mr-2">用户名:</span>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-48"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            type="primary"
            onClick={startLocalStream}
            disabled={!!localStream}
          >
            开启摄像头
          </Button>
          <Button
            type="primary"
            onClick={closeLocalStream}
            disabled={!localStream}
            danger
          >
            关闭摄像头
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 本地视频 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-2">
            <h3 className="font-semibold">我 ({userName})</h3>
            <p className="text-sm text-gray-600">ID: {peerId}</p>
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 bg-black"
          />
        </div>

        {/* 远程视频列表 */}
        {peers.map((peerId) => {
          const stream = peerStreams[peerId];

          return (
            <div key={peerId} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-2">
                <h3 className="font-semibold">{peerId}</h3>
                <p className="text-sm text-gray-600">ID: {peerId}</p>
              </div>
              <video
                ref={(el: any) => {
                  remoteVideosRef.current[peerId] = el;
                  if (el && stream) {
                    el.srcObject = stream;
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-48 bg-black"
                onCanPlay={() => {
                  if (remoteVideosRef.current[peerId]) {
                    remoteVideosRef.current[peerId]!.srcObject = stream;
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">聊天区</h2>
        <div className="border rounded-lg p-4 mb-4 h-48 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="mb-2">
              {msg}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={sendChatMessage}
            placeholder="输入消息..."
          />
          <Button type="primary" onClick={sendChatMessage}>
            发送
          </Button>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>状态: {status}</p>
        <p>在线用户: {peers.length + 1} (包括你自己)</p>
      </div>
    </div>
  );
}
