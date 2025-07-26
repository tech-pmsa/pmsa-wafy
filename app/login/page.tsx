"use client";
import Image from "next/image";
import { useState } from "react";
import { CiLogin } from "react-icons/ci";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid email or password.");
      return;
    }

    const uid = signInData.user.id;

    // Check 'profiles' table (officer, class, class-leader)
    let { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("uid", uid)
      .single();

    if (profileData) {
      switch (profileData.role) {
        case "officer":
          router.push("/officer/officer-dashboard");
          return;
        case "class":
          router.push("/classroom/class-dashboard");
          return;
        case "class-leader":
          router.push("/classleader/class-leader-dashboard");
          return;
        default:
          setError("Access denied: Invalid role.");
          await supabase.auth.signOut();
          return;
      }
    }

    // If not in profiles, check 'students' table
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("role")
      .eq("uid", uid)
      .single();

    if (studentData?.role === "student") {
      router.push("/students/student-dashboard");
      return;
    }

    // No matching role
    setError("Access denied: No valid role found.");
    await supabase.auth.signOut();
  };
  ;

  return (
    <div className="flex min-h-screen w-full bg-[url('/sm.svg')] bg-cover">
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

          <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
            {/* Email Field */}
            <div>
              <label className="block mb-1 text-text-grey">Email</label>
              <div className="flex items-center border border-primary-dark-grey bg-transparent rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-button-yellow">
                <Image
                  src="/email.png"
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
                  src="/lock.png"
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

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-button-yellow text-button-text-black py-2 rounded-xl hover:bg-primary-dark-grey transition duration-200 flex items-center justify-center gap-2"
            >
              <span>Login</span>
              <CiLogin size={22} />
            </button>
          </form>
        </div>
      </div>

      {/* Right: Full Image Side */}
      <div className="hidden md:flex md:w-1/2 h-screen relative">
        <Image
          src="/college3d.png"
          alt="College 3D"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
