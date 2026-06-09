// frontend/src/app/register/page.tsx
"use client"; // Tells Next.js this page runs in the user's browser

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Viewer");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the page from refreshing
    try {
      await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
      alert("Registration successful! Please log in.");
      router.push("/login"); // Send them to the login page
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">

    {/* Background Effects */}
    <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-0 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-3xl"></div>

    <div className="w-full max-w-md relative z-10">

      <div className="bg-[#111111] border border-[#222222] rounded-3xl p-8 shadow-[0_0_40px_rgba(168,85,247,0.15)]">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            PixVault
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Create Your Account
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#171717] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#171717] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Account Type
            </label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#171717] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
            >
              <option value="Viewer">
                Viewer (View & Download Photos)
              </option>

              <option value="Admin">
                Admin (Create Events & Upload Media)
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            Create Account
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-purple-400 hover:text-purple-300"
          >
            Login here
          </a>
        </p>

      </div>
    </div>
  </div>
);
}