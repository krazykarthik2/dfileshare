import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Link } from "react-router-dom";
import { toHumanBytes, toHumanSeconds } from "../util/util";
const Receive = () => {
  const [progress, setProgress] = useState(0);
const [eta, setEta] = useState(null);
const startTimeRef = useRef(null);


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

  let fileMeta = null;
  let controller;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      socket.close();
    }
  });

  socket.onopen = () => {
    setMessage("Connected. Waiting for file...");
  };

  socket.onmessage = (e) => {
    if (typeof e.data === "string") {
      try {
        const meta = JSON.parse(e.data);
        if (meta.filename && meta.type) {
          fileMeta = meta;
          setFileInfo(meta);
          setMessage(`Receiving ${meta.filename}...`);
        }
      } catch (err) {
        console.error("Invalid metadata string:", e.data);
      }
    } else {
      const chunk = new Uint8Array(e.data);
      if (controller) {
        controller.enqueue(chunk); // push to stream
      }
      setReceivedChunks((prev) => [...prev, chunk.buffer]); // still buffer for later
      console.log("Received binary chunk:", chunk.byteLength);
    }
  };

  socket.onclose = () => {
    if (controller) controller.close();
    setMessage("WebSocket connection closed.");
  };

  socket.onerror = () => {
    setMessage("WebSocket error.");
    if (controller) controller.error("WebSocket error.");
  };
};

  useEffect(() => {
    
      if (!fileInfo) {
        setMessage("Connection closed before metadata received.");
        return;
      }

      let receivedSize = receivedChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      if (!startTimeRef.current) startTimeRef.current = Date.now();
const percent = Math.round((receivedSize / fileInfo.size) * 10000) / 100;
setProgress(percent);

const elapsed = (Date.now() - startTimeRef.current) / 1000; // in seconds
const speed = receivedSize / elapsed; // bytes per sec
const remaining = fileInfo.size - receivedSize;
const estimatedTime = remaining / speed;

setEta(Math.ceil(estimatedTime));

      if(receivedSize < fileInfo.size) {
        console.log("Received chunks:", receivedChunks);
        console.log("Expected size:", fileInfo.size);
        console.log("Received size:", receivedSize);
        console.log("Received chunks count:", receivedChunks.length);
        setMessage(`File received is not complete yet.\n${receivedChunks.length}/${fileInfo.totalChunks} chunks received`);
        return; 
      }
      try {
        //delete extra data in recievedChunks 
        let actSize = fileInfo.size
        console.log(receivedChunks)
        for( let i =0;i<receivedChunks.length;i++){
          if(receivedChunks[i].byteLength>actSize){
            // cut off extra bytes in the receivedChunks[i]
            receivedChunks[i].slice(0,actSize)
          }
          actSize-=receivedChunks[i].byteLength
        }
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
      <pre className="mt-4 text-sm text-green-600">{message}</pre>
{fileInfo && progress < 100 && (
  <div className="w-full max-w-md mt-2">
    <div className="w-full bg-gray-200 rounded-full h-4">
      <div
        className="bg-green-600 h-4 rounded-full"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="text-xs text-gray-600 mt-1 flex justify-between">
      <span>{progress}%</span>
      <span>{eta ? `~${toHumanSeconds(eta)} left` : 'Estimating...'}</span>
    </div>
  </div>
)}

      {downloadUrl && fileInfo && (
        <a
          href={downloadUrl}
          download={fileInfo.filename}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          accessKey="o"
        >
          <div className="flex">D<u>o</u>wnload {fileInfo.filename}</div>
          <div className="flex">{" (" + toHumanBytes(fileInfo.size) + ")"}</div>
          <div className="flex">{" (" + fileInfo.type + ")"}</div>
        </a>
      )}

      <Link to="/" className="mt-6 text-blue-500" accessKey="b">
        <u>B</u>ack
      </Link>
      <Link to="/send" className="mt-2 text-blue-500" accessKey="s">
        <u>S</u>end File
      </Link>
    </div>
  );
};

export default Receive;
