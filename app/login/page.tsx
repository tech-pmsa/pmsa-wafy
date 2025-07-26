"use client";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen w-full bg-[url('/sm.svg')] bg-cover ">
      {/* Left: Login Form */}
      <div className="w-full md:w-1/2 flex justify-center items-center px-6 py-12">
        <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Welcome to
            </h1>
            <p className="text-lg text-gray-600">PMSA Wafy College</p>
          </div>

          <h2 className="text-4xl font-semibold mb-8 text-heading-text-black font-body">
            Login
          </h2>
          <form className="w-full max-w-md space-y-6">
            {/* Email Field */}
            <div>
              <label className="block mb-1 text-text-grey">Email</label>
              <div className="flex items-center border border-primary-dark-grey bg-transparent rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-button-yellow">
                <Image
                  src='/profile.png'
                  alt="Email"
                  width={35}
                  height={35}
                  className="mr-2"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full outline-none bg-transparent placeholder-text-grey text-text-grey"
                  placeholder="you@pmsa.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block mb-1 text-text-grey">Password</label>
              <div className="flex items-center border border-primary-dark-grey bg-transparent rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-button-yellow">
                <Image
                  src='/lock.png'
                  alt="Password"
                  width={35}
                  height={35}
                  className="mr-2"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full outline-none bg-transparent placeholder-text-grey text-text-grey"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-button-yellow text-button-text-black py-2 rounded-xl hover:bg-primary-dark-grey transition duration-200"
            >
              Login
            </button>
          </form>
        </div>
      </div>

      {/* Right: Full Image Side */}
      <div className="hidden md:flex md:w-1/2 h-screen relative">
        <Image
          src='/college3d.png'
          alt="College 3D"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
