"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function FavoritesPage() {
  const router = useRouter();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await fetchApi("/api/social/favorites/me");
      setFavorites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">

      <div className="flex items-center justify-between mb-10">

        <div>
          <h1 className="text-4xl font-bold">
            ⭐ My Favorites
          </h1>

          <p className="text-gray-400 mt-2">
            All saved memories in one place
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="bg-[#171717] border border-[#262626] px-4 py-2 rounded-xl hover:border-purple-500 transition"
        >
          ← Dashboard
        </button>

      </div>

      {loading ? (
        <p>Loading favorites...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

  {favorites.map((item) => (
    <div
      key={item._id}
      className="bg-[#111111] border border-[#222222] rounded-3xl overflow-hidden cursor-pointer hover:border-amber-500 hover:scale-[1.02] transition"
    >
      <img
  src={item.s3_url}
  alt="Favorite"
  onClick={() => setSelectedPhoto(item)}
  className="w-full h-64 object-cover cursor-pointer"
/>

      <div className="p-4">
  <div className="flex items-center justify-between">
    <span className="text-amber-400 text-sm font-medium">
      ★ Favorite
    </span>

    <span className="text-gray-500 text-xs">
      Click to Preview
    </span>
  </div>
</div>
    </div>
  ))}

</div>
      )}

      {selectedPhoto && (
  <div
    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
    onClick={() => setSelectedPhoto(null)}
  >
    <img
      src={selectedPhoto.s3_url}
      alt="Preview"
      className="max-w-[90vw] max-h-[90vh] rounded-2xl"
    />
  </div>
)}

    </div>
  );
}