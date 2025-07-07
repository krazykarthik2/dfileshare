import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { v4 as uuidv4 } from "uuid";

const Send = () => {
  const sessionId = useMemo(() => uuidv4(), []);
  const wsUrl = `${process.env.REACT_APP_WS}/?id=${sessionId}&role=sender`; // Update IP!
  const qrUrl = `${process.env.REACT_APP_WS}/?id=${sessionId}&role=sender`;

  const [count, setCount] = useState(0);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Waiting for connection...");
  const [file, setFile] = useState(null);
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnected(true);
      setStatus("Connected. Waiting for receiver to join...");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "receiver_connected") {
          setStatus("Receiver connected. Select a file to send.");
        }
      } catch {
        // Not JSON, ignore (or log if needed)
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setStatus("WebSocket disconnected.");
    };

    ws.onerror = () => {
      setStatus("WebSocket error.");
    };

    return () => ws.close();
  }, [wsUrl]);

  const sendFile = () => {
    if (
      !file ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      setStatus("File not ready or WebSocket not open.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const buffer = reader.result;

      // 1. Send metadata
      const meta = {
        filename: file.name,
        size: file.size,
        type: file.type,
      };
      console.log("Sending metadata:", meta);
      console.log("Sending file buffer of size:", buffer.byteLength);

      wsRef.current.send(JSON.stringify(meta));

      // 2. Send file content
      wsRef.current.send(buffer);

      setStatus(`Sent file: ${file.name}`);
      setCount((prev) => prev + 1);
    };

    reader.onerror = () => {
      setStatus("Failed to read file.");
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <h2 className="text-xl font-semibold mb-4">Send File</h2>

      <QRCode value={qrUrl} size={200} />
      <p className="mt-2 text-xs text-gray-600 break-all">{qrUrl}</p>
    
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mt-4"
        disabled={!connected}
      />

      <button
        onClick={sendFile}
        disabled={!file || !connected}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        Send
      </button>

      <p className="mt-2 text-sm text-green-600">{status}:{count}</p>

      <Link to="/" className="mt-4 text-blue-500 underline">
        Back
      </Link>
    </div>
  );
};

export default Send;
