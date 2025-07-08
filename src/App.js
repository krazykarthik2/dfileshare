import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import QRCode from "react-qr-code";
import Receive from "./components/Receive";
import Send from "./components/Send";
import { v4 as uuidv4 } from "uuid";
import "./index.css"; // Ensure you have your global styles set up
import "./tailwind.css"; // Ensure you have Tailwind CSS set up

const Home = () => (
  <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
    <h1 className="text-3xl font-bold ">QR File Share</h1>
    <div className=" w-full h-full flex justify-center flex-col h-full flex-grow">
      <Link
        to="/send"
        className="bg-blue-500 text-white px-6 py-2 rounded h-full flex items-center justify-center flex-grow hover:bg-blue-600"
        accessKey="s"
      >
        <u>S</u>end
      </Link>
      <Link
        to="/receive"
        className="bg-green-500 text-white px-6 py-2 rounded h-full flex items-center justify-center flex-grow hover:bg-green-600"
        accessKey="r"
      >
        <u>R</u>eceive
      </Link>
    </div>
    <div className="text-3xl">
      Made by{" "}
      <a
        href="https://github.com/krazykarthik2"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        github.com/krazykarthik2
      </a>
    </div>
  </div>
);

export default function App() {
  // This is the main App component that sets up the router and routes

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/send" element={<Send />} />
        <Route path="/receive" element={<Receive />} />
      </Routes>
    </Router>
  );
}
