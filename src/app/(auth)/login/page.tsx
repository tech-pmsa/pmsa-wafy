// app/login/page.tsx or pages/login.tsx
"use client";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen">
      {/* Left Image Side */}
      <div className="w-1/2 bg-gray-100 flex items-center justify-center p-8">
        <Image
          src="./college3d.png" // move image to /public folder if not using dynamic import
          alt="College 3D Image"
          width={400}
          height={400}
          className="rounded-lg shadow-lg"
        />
      </div>

      {/* Right Login Card */}
      <div className="w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md bg-gray-50 rounded-2xl shadow-xl p-10">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Login to Your Account
          </h2>
          <form className="space-y-5">
            <div>
              <label className="block mb-1 text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition duration-200"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
