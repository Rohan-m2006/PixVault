// frontend/src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface Event {
  _id: string;
  name: string;
  description: string;
  date: string;
  category: string;
  visibility: string;
}

interface MediaSearchResult {
  _id: string;
  event_id: string;
  s3_url: string;
  tags: string[];
}

interface FavoriteItem {
  _id: string;
  event_id: string;
  s3_url: string;
}

export default function DashboardPage() {
  const router = useRouter();
  
  // App States
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sort and Filter States
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState<MediaSearchResult[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [profileAvatar, setProfileAvatar] = useState<string | null>(
  typeof window !== "undefined"
    ? localStorage.getItem("profileAvatar")
    : null
);

  const loadFavorites = async () => {
    try {
      const data = await fetchApi("/api/social/favorites/me");
      setFavorites(data);
    } catch (err: any) {
      console.error("Failed to fetch dashboard favorites:", err);
    }
  };

  const loadNotifications = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    const data = await fetchApi("/api/notifications/");
    setNotifications(data);
  } catch (err) {
    console.error("Failed to load notifications:", err);
  }
};

const markNotificationRead = async (notificationId: string) => {
  try {
    await fetchApi(
      `/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
      }
    );

    setNotifications((prev) =>
      prev.filter((n) => n._id !== notificationId)
    );
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
};

  const handleTagSearch = async (queryStr: string) => {
    setTagQuery(queryStr);
    
    if (!queryStr.trim()) {
      setTagResults([]);
      return;
    }

    try {
      const data = await fetchApi(`/api/search/?query=${encodeURIComponent(queryStr)}`);
      setTagResults(data);
    } catch (err: any) {
      console.error("AI tag search connection failed:", err);
    }
  };

  // Admin Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Cultural");
  const [visibility, setVisibility] = useState("public");

  // 1. Initial Load: Check auth and pull event data from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    
    if (!token) {
      // No wristband? Kick them back to the login room
      router.push("/login");
      return;
    }

    setRole(userRole);
    loadEvents();
loadFavorites();
loadNotifications();

const interval = setInterval(() => {
  loadNotifications();
}, 10000);

return () => clearInterval(interval);
  }, [router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/api/events/");
      setEvents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Admin Only: Handle creating a new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("/api/events/", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          date,
          category,
          visibility,
        }),
      });
      
      alert("Event created successfully!");
      // Reset form fields
      setName("");
      setDescription("");
      setDate("");
      setCategory("Cultural");
      setVisibility("public");
      
      // Refresh the list to show the new event immediately
      loadEvents();
    } catch (err: any) {
      alert("Error creating event: " + err.message);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onloadend = () => {
    const avatar = reader.result as string;

    localStorage.setItem("profileAvatar", avatar);
    setProfileAvatar(avatar);
  };

  reader.readAsDataURL(file);
};
  // 3. User Actions: Log out
  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // 4. Processing logic for Sorting and Searching
  const processedEvents = [...events]
    .filter((event) => 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return new Date(a.date).getTime() - new Date(b.date).getTime(); // Default: Date
    });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-black">
        <p className="text-xl font-semibold">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* HEADER BAR */}
      <header className="bg-[#0f0f0f]/90 backdrop-blur-xl border-b border-[#262626] px-6 py-5 flex justify-between items-center sticky top-0 z-40">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-fuchsia-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
  PixVault
</h1>

          <p className="text-xs text-gray-400">Logged in as: <span className="font-semibold text-purple-400">{role}</span></p>
          <p className="text-xs text-gray-500">
Smart Event Archive & Media Discovery
</p>
        </div>
        <div className="flex items-center gap-3">
        <div className="relative">
  <button
    onClick={() => setShowNotifications(!showNotifications)}
    className="bg-[#171717] border border-purple-500/40 text-purple-300 p-3 rounded-xl hover:border-purple-400 hover:bg-purple-500/10 transition"
  >
    🔔
    {notifications.length > 0 && (
      <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
        {notifications.length}
      </span>
    )}
  </button>

  {showNotifications && (
    <div className="absolute right-0 mt-3 w-80 bg-[#111111] border border-[#262626] rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-[#262626] font-semibold text-white">
        Notifications
      </div>

      {notifications.length === 0 ? (
        <div className="p-4 text-gray-400 text-sm">
          No notifications
        </div>
      ) : (
        notifications.map((n) => (
  <div
    key={n._id}
    className="p-4 border-b border-[#222222]"
  >
    <p className="text-sm text-gray-300">
      {n.message}
    </p>

    <button
      onClick={() => markNotificationRead(n._id)}
      className="mt-2 text-xs text-purple-400 hover:text-purple-300"
    >
      Mark as Read
    </button>
  </div>
))
      )}
    </div>
  )}
</div>

  {role === "Admin" && (
    <button
      onClick={() => setIsCreateModalOpen(true)}
      className="
px-6 py-3
rounded-2xl
font-bold
text-white
bg-gradient-to-r
from-fuchsia-600
via-purple-600
to-indigo-600
shadow-[0_0_25px_rgba(168,85,247,0.45)]
hover:shadow-[0_0_40px_rgba(168,85,247,0.8)]
hover:scale-105
transition-all
duration-300
"
    >
      + Create Event
    </button>

    
  )}

  <div className="flex items-center gap-4 bg-[#111111] border border-[#222222] rounded-2xl px-4 py-3">

      <button
    onClick={() => router.push("/favorites")}
    className="bg-[#171717] border border-[#262626] text-gray-200 px-4 py-2 rounded-xl hover:border-amber-500 hover:text-amber-400 transition"
  >
    ⭐ Favorites
  </button>

  <button
  onClick={() => setShowProfile(true)}
  className="flex items-center gap-3 bg-[#171717] border border-[#262626] px-3 py-2 rounded-xl hover:border-purple-500 transition"
>

  {profileAvatar ? (
    <img
      src={profileAvatar}
      alt="Avatar"
      className="w-8 h-8 rounded-full object-cover border border-purple-500"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
      👤
    </div>
  )}

<div className="text-left">
  <p className="text-white text-sm font-medium">
    {role}
  </p>

  <p className="text-gray-500 text-xs">
    PixVault Member
  </p>
</div>
</button>

  <button
    onClick={handleLogout}
    className="bg-[#171717] border border-[#262626] text-gray-200 px-4 py-2 rounded-xl hover:border-red-500 hover:text-red-400 text-sm transition"
  >
    Logout
  </button>

</div>

</div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT COLUMN: CONTROLS & ADMIN FORMS */}
        <div className="lg:col-span-1 space-y-6 sticky top-28 h-fit max-w-[280px]">
          
          {/* SEARCH & SORT PANEL */}
          <div className="bg-[#171717] p-6 rounded-2xl shadow-lg border border-[#262626]">
           <h3 className="text-lg font-semibold text-white">
  Filter & Sort
</h3>

<p className="text-xs text-gray-500 mb-4">
  Quickly locate events and media
</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Search Events</label>
                <input 
                  type="text" 
                  placeholder="Type to search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1 block w-full border border-[#2f2f2f] rounded-xl p-3 text-sm text-gray-200 bg-[#0f0f0f] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Search Media by AI Tags</label>
                <input
                  type="text"
                  placeholder="e.g., academic gown, laptop..."
                  value={tagQuery}
                  onChange={(e) => handleTagSearch(e.target.value)}
                  className="mt-1 block w-full border border-[#262626] rounded-md p-2 text-sm text-gray-200 bg-[#0f0f0f] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Sort By</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                 className="mt-1 block w-full border border-[#262626] rounded-md p-2 text-sm text-gray-200 bg-[#0f0f0f]"
                >
                  <option value="date">Date (Earliest First)</option>
                  <option value="name">Event Name (A-Z)</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>
          </div>

          {/* ADMIN ONLY: CONSOLE WRAPPER */}
         
         
        </div>

        {/* RIGHT COLUMN: THE EVENT GRID DISPLAY */}
        <div className="lg:col-span-4">
          {error && <p className="text-red-500 mb-4 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
          
           

          {processedEvents.length === 0 ? (
            <div className="bg-white text-center py-16 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">No events found matching your parameters.</p>
              <p className="text-sm text-gray-400 mt-1">If you are an Admin, use the panel to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
              {processedEvents.map((event) => (
                <div 
                  key={event._id} 
                  onClick={() => router.push(`/events/${event._id}`)}
                 className="bg-gradient-to-b from-[#1b1b1b] to-[#111111] rounded-3xl border border-[#262626] p-5 hover:border-fuchsia-500 hover:shadow-[0_0_35px_rgba(217,70,239,0.25)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-2 mb-3 flex-wrap">

                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/40 text-purple-300">
                        {event.category}
                      </span>

                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          event.visibility === "private"
                            ? "bg-red-900/40 text-red-300"
                            : "bg-emerald-900/40 text-emerald-300"
                        }`}
                      >
                        {event.visibility === "private"
                          ? "🔒 Private"
                          : "🌍 Public"}
                      </span>

                  </div>
                    <h4 className="text-2xl font-bold text-white mb-3 tracking-tight line-clamp-2">
  {event.name}
</h4>
                   <p className="text-sm text-gray-400 line-clamp-2 mb-6">{event.description}</p>
                  </div>
                  <div className="border-t border-[#262626] pt-3 flex justify-between items-center text-xs text-gray-400">
                    <span className="text-gray-500">
  📅 {event.date}
</span>
                    <span className="text-purple-400 font-semibold transition group-hover:text-purple-300">
  Open Album →
</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {tagQuery.trim() && (
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                AI Tag Discoveries for &quot;{tagQuery}&quot;
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({tagResults.length} asset matches)
                </span>
              </h3>

              {tagResults.length === 0 ? (
                <p className="text-sm text-gray-400 italic mt-2 bg-gray-100 p-3 rounded-md border border-gray-200">
                  No images across any album match that label. Try another term!
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {tagResults.map((media) => (
                    <div
                      key={media._id}
                      onClick={() => router.push(`/events/${media.event_id}`)}
                      className="group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div className="aspect-square relative bg-gray-100 overflow-hidden">
                        <img
                          src={media.s3_url}
                          alt="AI Match Element"
                          className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="p-2.5 bg-white border-t border-gray-50">
                        <div className="flex gap-1 flex-wrap">
                          {media.tags.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-50 text-gray-300 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-blue-500 font-medium mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Event Album →
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
        
      </main>
      {isCreateModalOpen && role === "Admin" && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

    <div
      className="absolute inset-0"
      onClick={() => setIsCreateModalOpen(false)}
    />

    <div className="relative w-full max-w-xl bg-gradient-to-b from-[#1a1a1a] to-[#111111] border border-[#262626] rounded-[32px] p-6 shadow-[0_0_80px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto">

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          Create New Event
        </h2>

        <p className="text-gray-400 mt-2 text-sm">
    Launch a new event and start collecting media instantly.
  </p>

        <button
  onClick={() => setIsCreateModalOpen(false)}
  className="
  w-10 h-10
  rounded-xl
  border border-[#262626]
  bg-[#0f0f0f]
  text-gray-400
  hover:text-white
  hover:border-purple-500
  transition
  "
>
  ✕
</button>
      </div>

      <form
        onSubmit={async (e) => {
          await handleCreateEvent(e);
          setIsCreateModalOpen(false);
        }}
        className="space-y-3"
      >
        <div>
  <label className="block text-xs font-medium text-gray-300">
    Event Title
  </label>
  <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="mt-1 block w-full border border-[#262626] rounded-md p-2 text-sm text-gray-200 bg-[#0f0f0f]"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-300">
    Description
  </label>
  <textarea
    required
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className="mt-1 block w-full border border-[#2f2f2f] rounded-xl p-3 text-sm text-gray-200 bg-[#0f0f0f] h-20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-300">
    Event Date
  </label>
  <input
    type="date"
    required
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="mt-1 block w-full border border-[#262626] rounded-md p-2 text-sm text-gray-200 bg-[#0f0f0f] appearance-none"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-300">
    Category
  </label>
  <select
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    className="mt-1 block w-full border border-[#2f2f2f] rounded-xl p-3 text-sm text-gray-200 bg-[#0f0f0f] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
  >
    <option value="Cultural">Cultural Fest</option>
    <option value="Technical">Technical Workshop</option>
    <option value="Sports">Sports Meet</option>
    <option value="Party">Social / Party</option>
  </select>
</div>

<div>
  <label className="block text-xs font-medium text-gray-300">
    Album Visibility
  </label>

  <select
    value={visibility}
    onChange={(e) => setVisibility(e.target.value)}
    className="mt-1 block w-full border border-[#262626] rounded-md p-2 text-sm text-gray-200 bg-[#0f0f0f]"
  >
    <option value="public">🌍 Public</option>
    <option value="private">🔒 Private</option>
  </select>
</div>

<div className="flex gap-3 pt-4">
  <button
    type="button"
    onClick={() => setIsCreateModalOpen(false)}
    className="flex-1 border border-[#262626] py-3 rounded-xl"
  >
    Cancel
  </button>

  <button
    type="submit"
    className="
flex-1
py-3
rounded-xl
font-semibold
text-white
bg-gradient-to-r
from-fuchsia-600
via-purple-600
to-indigo-600
shadow-[0_0_20px_rgba(168,85,247,0.45)]
hover:shadow-[0_0_35px_rgba(168,85,247,0.8)]
hover:scale-[1.03]
transition-all
duration-300
"
  >
    Publish Event
  </button>
</div>
      </form>

    </div>

  </div>
)}

{showProfile && (
  <div
    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
    onClick={() => setShowProfile(false)}
  >
    <div
      className="bg-[#111111] border border-[#262626] rounded-3xl p-8 w-[400px] shadow-[0_0_40px_rgba(168,85,247,0.2)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">

        <div className="relative">

  {profileAvatar ? (
    <img
      src={profileAvatar}
      alt="Profile"
      className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
    />
  ) : (
    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(168,85,247,0.35)]">
      👤
    </div>
  )}

</div>  

        <h2 className="text-white text-2xl font-bold mt-5">
          {localStorage.getItem("email")}
        </h2>

<p className="text-purple-400 mt-2">
  {role}
</p>

<p className="text-gray-500 text-sm mt-1">
  PixVault Member
</p>

<div className="mt-4">

  <label className="cursor-pointer inline-block bg-[#171717] border border-[#262626] px-4 py-2 rounded-xl hover:border-purple-500 transition">

    Change Avatar

    <input
      type="file"
      accept="image/*"
      onChange={handleAvatarUpload}
      className="hidden"
    />

  </label>

</div>
        <div className="mt-6 bg-[#171717] border border-[#222222] rounded-2xl p-4">
          <p className="text-green-400 font-semibold">
            ✓ Face Recognition Enabled
          </p>

          <p className="text-gray-400 text-sm mt-2">
            Your account is connected to PixVault AI facial search.
          </p>
        </div>

        <button
          onClick={() => setShowProfile(false)}
          className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl transition"
        >
          Close
        </button>

      </div>
    </div>
  </div>
)}
      
    </div>
  );
}