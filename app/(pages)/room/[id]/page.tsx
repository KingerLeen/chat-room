'use client';

import { useEffect, useRef, useState } from 'react';

export default function ChatPage() {
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/chat-room/ws`;

    ws.current = new WebSocket(wsUrl);
    
    ws.current.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
      setMessages((prev) => [...prev, 'Connected to chat room']);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
      setMessages((prev) => [...prev, 'Disconnected from chat room']);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (ws.current?.readyState === WebSocket.OPEN && input.trim()) {
      ws.current.send(input);
      setInput('');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat Room</h1>
      
      <div className="border rounded-lg p-4 mb-4 h-64 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2">{msg}</div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}