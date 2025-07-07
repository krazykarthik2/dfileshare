import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Link } from "react-router-dom";

const Receive = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [receivedChunks, setReceivedChunks] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [message, setMessage] = useState("Waiting for QR scan...");
  const [qr, setQr] = useState(null);

  const connectToWebSocket = (url) => {
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      setMessage("Connected. Waiting for file...");
    };
    socket.onmessage = (e) => {
      console.log("Received message:", e.data);
      if (typeof e.data === "string") {
        try {
          const meta = JSON.parse(e.data);
          if (meta.filename && meta.type) {
            setFileInfo(meta);
            setMessage(`Receiving ${meta.filename}...`);
          }
        } catch (err) {
          console.error("Invalid metadata string:", e.data);
        }
      } else {
        console.log("Received binary chunk:", e.data.byteLength);
        setReceivedChunks((prev) => [...prev, e.data]);
      }
      
    };

    socket.onclose = () => {
      setMessage("WebSocket connection closed.");
    };

    socket.onerror = () => {
      setMessage("WebSocket error.");
    };
  };
  useEffect(() => {
    
      if (!fileInfo) {
        setMessage("Connection closed before metadata received.");
        return;
      }

      let receivedSize = receivedChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      if(receivedSize !== fileInfo.size) {
        console.log("Received chunks:", receivedChunks);
        console.log("Expected size:", fileInfo.size);
        console.log("Received size:", receivedSize);
        console.log("Received chunks count:", receivedChunks.length);
        setMessage(`File received is not complete yet.at ${Math.round(receivedSize/fileInfo.size * 10000,2)/100}% bytes.`);
        return; 
      }
      try {
        const blob = new Blob(receivedChunks, { type: fileInfo.type });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setMessage("File ready to download.");
      } catch (err) {
        console.error("Failed to create blob from chunks", err);
        setMessage("Error assembling file.");
      }
  }, [fileInfo, receivedChunks]);

  useEffect(() => {
    let animationId;
    let stream;

    const scanFrame = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      if (code) {
        setQr(code.data);
        const scannedUrl = code.data.replace("role=sender", "role=receiver");
        console.log("Connecting to:", scannedUrl);

        connectToWebSocket(scannedUrl);
        cancelAnimationFrame(animationId);
        return;
      }

      animationId = requestAnimationFrame(scanFrame);
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        animationId = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error("Camera error:", err);
        setMessage("Camera access denied.");
      }
    };

    startCamera();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      {!qr && (
        <h2 className="text-xl font-semibold mb-4">Scan QR to Receive File</h2>
      )}
      {qr && (
        <h2 className="text-xl font-semibold mb-4">
          {qr?.slice(qr?.indexOf("?id=") + 4, qr?.lastIndexOf("&role="))}
        </h2>
      )}
      <video
        ref={videoRef}
        className="w-full max-w-md rounded"
        autoPlay
        muted
        playsInline
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <p className="mt-4 text-sm text-green-600">{message}</p>

      {downloadUrl && fileInfo && (
        <a
          href={downloadUrl}
          download={fileInfo.filename}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Download {fileInfo.filename}
        </a>
      )}

      <Link to="/" className="mt-6 text-blue-500 underline">
        Back
      </Link>
    </div>
  );
};

export default Receive;
