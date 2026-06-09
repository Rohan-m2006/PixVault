// frontend/src/lib/api.ts

// Get the backend URL from the .env.local file we made in Step 1
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // 1. Check if the user has a token saved in their browser's Local Storage
  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem("access_token") || "";
  }

  // 2. Set up the headers (telling the backend we are sending JSON and our Token)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  console.log("TOKEN =", token);
console.log("HEADERS =", headers);

  // 3. Make the actual request to the FastAPI backend
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }

  return data;
}