// frontend/src/app/events/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface EventDetails {
  _id: string;
  name: string;
  description: string;
  date: string;
  category: string;
}

interface Comment {
  user_id: string;
  text: string;
}

interface MediaItem {
  _id: string;
  event_id: string;
  media_type?: string;
  s3_url: string;
  tags: string[];
  likes: string[];
  comments: Comment[];
  favorites: string[];
}

interface EventAnalytics {
  event_id: string;
  total_media: number;
  total_likes: number;
  total_comments: number;
  most_liked_media: {
    _id: string;
    s3_url: string;
    likes_count: number;
  } | null;
}

export default function EventGalleryPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const currentRole = localStorage.getItem("role");

  const searchParams = useSearchParams();
  const photoParam = searchParams.get("photo");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const [showFindMeModal, setShowFindMeModal] = useState<boolean>(false);
  const [findMeFile, setFindMeFile] = useState<File | null>(null);
  const [findMeLoading, setFindMeLoading] = useState<boolean>(false);
  const [findMeResults, setFindMeResults] = useState<any[]>([]);
  const [findMeError, setFindMeError] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState("all");

  // Global State
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // Interactive Modal State
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [commentText, setCommentText] = useState("");

  // Upload & Download States
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  

  const handleDeleteMedia = async (mediaId: string) => {
  const confirmed = window.confirm(
    "Are you sure you want to permanently delete this photo?"
  );

  if (!confirmed) return;

  try {
    setDeleting(true);

    const token = localStorage.getItem("token");
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const response = await fetch(
      `${API_URL}/api/media/${mediaId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Delete failed");
    }

    setMediaItems((prev) =>
      prev.filter((item) => item._id !== mediaId)
    );

    setSelectedMedia(null);

    alert("Photo deleted successfully.");
  } catch (err: any) {
    alert(err.message || "Failed to delete photo.");
  } finally {
    setDeleting(false);
  }
};

  const handleShareAlbum = () => {
    const albumUrl = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(albumUrl)
      .then(() => {
        setToastMessage("Album link copied!");
        setTimeout(() => setToastMessage(null), 2500);
      })
      .catch((err) => console.error("Could not copy album link:", err));
  };

  const handleSharePhoto = (mediaId: string) => {
    const photoUrl = `${window.location.origin}/events/${eventId}?photo=${mediaId}`;
    navigator.clipboard.writeText(photoUrl)
      .then(() => {
        setToastMessage("Photo link copied!");
        setTimeout(() => setToastMessage(null), 2500);
      })
      .catch((err) => console.error("Could not copy photo link:", err));
  };

  const handleDownloadQr = async () => {
    const albumUrl = `${window.location.origin}/events/${eventId}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(albumUrl)}`;
    
    try {
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = `QR-${event?.name || "Event"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
      
      setToastMessage("QR Code download initiated!");
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error("Failed to extract QR asset streams:", err);
      alert("Unable to download QR code. Please try again.");
    }
  };

    useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    router.push("/login");
    return;
  }

  setRole(localStorage.getItem("role"));
  setUserId(localStorage.getItem("email") || "anonymous_user");

  loadFavoriteIds();
  loadEventAndMedia();

  const pollNotifications = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(
        `${API_URL}/api/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const notifications = await response.json();

      if (notifications.length > 0) {
        setToastMessage(notifications[0].message);
      }
    } catch (error) {
      console.error("Notification polling failed:", error);
    }
  };

  pollNotifications();

  const interval = setInterval(
    pollNotifications,
    10000
  );

  return () => clearInterval(interval);

}, [eventId, router]);

  const loadEventAndMedia = async () => {
    try {
      setLoading(true);
      const eventData = await fetchApi(`/api/events/${eventId}`);
      setEvent(eventData);

      const eventMedia = await fetchApi(`/api/media/event/${eventId}`);
      setMediaItems(eventMedia);

      // Auto-open shared photo if URL contains ?photo=
        if (photoParam) {
        const targetPhoto = eventMedia.find(
        (item: MediaItem) => item._id === photoParam
          );

      if (targetPhoto) {
        setSelectedMedia(targetPhoto);
        } 
        }


      if (currentRole === "Admin") {
       try {
         const analyticsData = await fetchApi(
          `/api/events/${eventId}/analytics`
         );

        setAnalytics(analyticsData);
       } catch (err) {
         console.error("Analytics fetch failed:", err);
       }  
      }

      if (selectedMedia) {
        const updatedCurrent = eventMedia.find((m: MediaItem) => m._id === selectedMedia._id);
        if (updatedCurrent) setSelectedMedia(updatedCurrent);
      }
    } catch (err: any) {
      console.error("Error loading gallery data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteIds = async () => {
    try {
      const favoriteData = await fetchApi("/api/social/favorites/me");
      setFavoriteIds(favoriteData.map((item: MediaItem) => item._id));
    } catch (err) {
      console.error("Unable to load favorites:", err);
    }
  };

  const handleFindMyPhotosSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!findMeFile) {
    setFindMeError("Please select a selfie first.");
    return;
  }

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  const token = localStorage.getItem("token");

  setFindMeLoading(true);
  setFindMeError(null);
  setFindMeResults([]);

  const formData = new FormData();
  formData.append("file", findMeFile);

  try {
    const response = await fetch(
      `${API_URL}/api/media/find-me/${eventId}`,
      {
        method: "POST",
        headers: {
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to search photos."
      );
    }

    setFindMeResults(data);

    if (data.length === 0) {
      setFindMeError("No matching photos found.");
    }
  } catch (err: any) {
    setFindMeError(err.message);
  } finally {
    setFindMeLoading(false);
  }
};

  const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  if (!uploading) {
    setIsDragging(true);
  }
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);

  if (uploading) return;

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const droppedFiles = Array.from(e.dataTransfer.files);

    const imageFiles = droppedFiles.filter(file =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;

    const newStagedFiles = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...newStagedFiles]);
  }
};

  const handleUpload = async (e: React.FormEvent) => {
  e.preventDefault();
  if (selectedFiles.length === 0) return;

  try {
    setUploading(true);

    const token = localStorage.getItem("token");
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    let successCount = 0;
    let failureCount = 0;

    for (const staged of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", staged.file);

        const response = await fetch(
          `${API_URL}/api/media/upload/${eventId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok)
          throw new Error(`Failed: ${staged.file.name}`);

        successCount++;
        URL.revokeObjectURL(staged.preview);
      } catch (error) {
        console.error(error);
        failureCount++;
      }
    }

    alert(
      `Batch Complete!\nSuccessfully Uploaded: ${successCount}\nFailed: ${failureCount}`
    );

    setSelectedFiles([]);
    await loadEventAndMedia();
  } catch (err: any) {
    alert(err.message);
  } finally {
    setUploading(false);
  }
};

  // ------------------------------------------------------------------
  // 🎨 THE REPAIRED CANVAS WATERMARKING ENGINE (SURGICAL FIX)
  // ------------------------------------------------------------------
  const handleDownloadWithWatermark = async (s3Url: string) => {
    if (!event) return;
    try {
      setDownloading(true);

      const img = new Image();
      img.crossOrigin = "anonymous"; // Keeps canvas secure
      
      // SURGICAL FIX: Append a unique timestamp query parameter.
      // This forces the browser to bypass its non-CORS cache and make a fresh 
      // network request to S3, fetching the clean image along with your S3 CORS headers.
      img.src = `${s3Url}${s3Url.includes("?") ? "&" : "?"}cachebust=${Date.now()}`;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          setDownloading(false);
          return;
        }

        ctx.drawImage(img, 0, 0);

        const fontSize = Math.max(16, Math.floor(img.width / 35));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 6;

        const watermarkText = `Club: EventMedia | Album: ${event.name} | Downloaded As: ${role}`;

        const textWidth = ctx.measureText(watermarkText).width;
        const paddingX = img.width * 0.03;
        const paddingY = img.height * 0.04;
        
        const textX = img.width - textWidth - paddingX;
        const textY = img.height - paddingY;

        ctx.fillText(watermarkText, textX, textY);

        const watermarkedDataUrl = canvas.toDataURL("image/jpeg", 0.9);

        const downloadLink = document.createElement("a");
        downloadLink.href = watermarkedDataUrl;
        downloadLink.download = `${event.name.replace(/\s+/g, "_")}_secure_album.jpg`;
        downloadLink.click();

        setDownloading(false);
      };

      img.onerror = (err) => {
        console.error("Canvas image stream failed to load:", err);
        alert("Image failed to load for watermarking. See console.");
        setDownloading(false);
      };

    } catch (err: any) {
      alert("Watermarking error: " + err.message);
      setDownloading(false);
    }
  };
  // ------------------------------------------------------------------

  const handleLike = async (mediaId: string) => {
    try {
      await fetchApi(`/api/social/${mediaId}/like`, { method: "POST" });
      await loadEventAndMedia();
    } catch (err: any) {
      alert("Error processing like action: " + err.message);
    }
  };

  const handleFavorite = async (mediaId: string) => {
    try {
      await fetchApi(`/api/social/${mediaId}/favorite`, {
        method: "POST",
      });

      await loadFavoriteIds();
      await loadEventAndMedia();
    } catch (err: any) {
      alert("Failed to update favorite: " + err.message);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedMedia) return;

    try {
      await fetchApi(`/api/social/${selectedMedia._id}/comment`, {
        method: "POST",
        body: JSON.stringify({ text: commentText }),
      });
      setCommentText("");
      await loadEventAndMedia();
    } catch (err: any) {
      alert("Failed to submit comment: " + err.message);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-black">
        <p className="text-xl font-semibold">Loading Album Gallery...</p>
      </div>
    );
  }

const photoItems = mediaItems.filter((item) => item.media_type !== "video");
const videoItems = mediaItems.filter((item) => item.media_type === "video");

const filteredPhotos =
  mediaFilter === "videos" ? [] : photoItems;

const filteredVideos =
  mediaFilter === "photos" ? [] : videoItems;


  const handleDeleteEvent = async () => {

  const confirmed = window.confirm(
    "Are you sure you want to delete this event?"
  );

  if (!confirmed) return;

  try {

    await fetchApi(`/api/events/${eventId}`, {
      method: "DELETE",
    });

    alert("Event deleted successfully");

    router.push("/");

  } catch (err) {

    console.error(err);
    alert("Failed to delete event");

  }
};

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      
      {/* HERO NAVIGATION PANEL */}
      <div className="bg-[#0f0f0f] border-b border-[#222222] text-white py-8 px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

  {/* LEFT SIDE */}
  <button
    onClick={() => router.push("/")}
    className="inline-flex items-center gap-2 bg-[#111111] border border-[#262626] text-gray-200 px-4 py-2.5 rounded-xl hover:border-purple-500 hover:text-purple-300 hover:bg-[#171717] transition shadow-sm w-fit"
  >
    <span className="text-blue-400">←</span>
    <span className="font-medium">Dashboard</span>
  </button>

  {/* RIGHT SIDE */}
  <div className="flex flex-wrap items-center gap-3 bg-[#111111] border border-[#222222] rounded-2xl px-4 py-3 shadow-[0_0_25px_rgba(168,85,247,0.06)]">

    <button
      onClick={handleShareAlbum}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] border border-[#262626] text-gray-200 hover:border-purple-500 hover:text-white transition"
    >
      <span>🔗</span>
      <span>Share Album</span>
    </button>

    <button
      onClick={() => setShowQrModal(true)}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] border border-[#262626] text-gray-200 hover:border-purple-500 hover:text-white transition"
    >
      <span>📱</span>
      <span>View Event QR</span>
    </button>

    <button
      onClick={() => {
        setFindMeFile(null);
        setFindMeResults([]);
        setFindMeError(null);
        setShowFindMeModal(true);
      }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white font-medium hover:scale-[1.02] active:scale-95 transition shadow-[0_0_20px_rgba(168,85,247,0.18)]"
    >
      <span>🧑</span>
      <span>Find My Photos</span>
    </button>

    {currentRole === "Admin" && (
  <button
    onClick={handleDeleteEvent}
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition"
  >
    🗑 Delete Event
  </button>
)}

  </div>
</div>

       {event && (
  <div className="grid lg:grid-cols-3 gap-8 bg-[#0d0d0d] border border-[#222222] rounded-3xl p-8">

    {/* LEFT SIDE */}

    <div className="lg:col-span-2">

      <span className="inline-block px-4 py-1 text-xs font-bold bg-purple-500/20 text-purple-300 rounded-full">
        {event.category}
      </span>

      <h2 className="text-4xl lg:text-5xl font-bold text-white mt-4">
        {event.name}
      </h2>

      <p className="text-gray-400 mt-4 text-lg">
        {event.description}
      </p>

      <div className="mt-6 text-gray-500">
        📅 Scheduled Date: {event.date}
      </div>

    </div>

    {/* RIGHT SIDE */}

<div>
  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
    Event Insights
  </p>

  <h3 className="text-lg font-semibold text-white mb-4">
    Live Analytics
  </h3>
    <div className="grid grid-cols-2 gap-4">

      <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 text-center">
        <p className="text-3xl font-bold text-white">
          {analytics?.total_media || 0}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Photos
        </p>
      </div>

      <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 text-center">
        <p className="text-3xl font-bold text-white">
          {analytics?.total_likes || 0}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Likes
        </p>
      </div>

      <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 text-center">
        <p className="text-3xl font-bold text-white">
          {analytics?.total_comments || 0}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Comments
        </p>
      </div>

     <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 text-center">
  <p className="text-3xl font-bold text-white">
    {favoriteIds?.length || 0}
  </p>

  <p className="text-gray-400 text-sm mt-1">
    Favorites
  </p>
</div>

    </div>
   </div>
  </div>
)}
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* ADMIN CLOUD UPLOAD BLOCK */}
        {role === "Admin" && (
          <div className="lg:col-span-1 bg-[#111111] p-6 rounded-3xl border border-[#222222] shadow-[0_0_30px_rgba(168,85,247,0.08)] h-fit">
            <h3 className="text-lg font-bold text-white mb-4">Upload Media</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={`border-2 border-dashed rounded-2xl p-6 text-center bg-[#0f0f0f] transition-all duration-200 ${
    isDragging
      ? "border-purple-500 bg-purple-950/20 shadow-[0_0_25px_rgba(124,58,237,0.25)] scale-[1.01]"
      : "border-[#333333] hover:border-purple-500"
  }`}
>
               <input
  id="media-upload-input"
  type="file"
  accept="image/*,video/*"
  multiple
  disabled={uploading}
  onChange={(e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      const newStagedFiles = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setSelectedFiles((prev) => [...prev, ...newStagedFiles]);
      e.target.value = "";
    }
  }}
  className="hidden"
/>

<label
  htmlFor="media-upload-input"
  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-semibold cursor-pointer hover:scale-[1.02] active:scale-95 transition shadow-[0_0_20px_rgba(168,85,247,0.25)]"
>
  <span>📁</span>
  Select Media
</label>

<p className="text-xs text-gray-400 mt-3">
  Upload photos and videos
</p>
                
  {/* 📸 STAGED BATCH UPLOAD THUMBNAIL PREVIEWS */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3 mt-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    Staged for Cluster Upload ({selectedFiles.length})
                  </span>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      // Prevent memory leaks by revoking all generated blobs before erasing
                      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
                      setSelectedFiles([]);
                    }}
                    className="text-[11px] text-zinc-500 hover:text-white transition-colors disabled:opacity-40"
                  >
                    Clear Batch
                  </button>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[180px] overflow-y-auto p-3 bg-[#111111] border border-[#222222] rounded-xl hide-scrollbar">
                  {selectedFiles.map((staged, index) => (
                    <div 
                      key={index} 
                      className="group relative h-20 rounded-xl overflow-hidden border border-[#222222] bg-[#171717]"
                    >
                      {staged.file.type.startsWith("video/") ? (
  <video
    src={staged.preview}
    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity"
    muted
    playsInline
  />
) : (
  <img
    src={staged.preview}
    alt="Batch Staged Source"
    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity"
  />
)}
                      
                      {/* Individual Prune/Remove Button */}
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          URL.revokeObjectURL(staged.preview); // Cleanup specific file memory tracking
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/80 hover:bg-purple-600 text-white text-[10px] rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/5 disabled:opacity-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>
              <button 
                type="submit" 
                disabled={selectedFiles.length === 0 || uploading}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition"
              >
                {uploading ? "Uploading to AWS..." : "Upload Media"}
              </button>
            </form>
          </div>
        )}


<div className="flex flex-wrap gap-3 mb-8">

  <button
    onClick={() => setMediaFilter("all")}
    className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
      mediaFilter === "all"
        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
        : "bg-[#171717] border border-[#262626] text-gray-400 hover:text-white"
    }`}
  >
    All ({mediaItems.length})
  </button>

  <button
    onClick={() => setMediaFilter("photos")}
    className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
      mediaFilter === "photos"
        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
        : "bg-[#171717] border border-[#262626] text-gray-400 hover:text-white"
    }`}
  >
    📷 Photos ({photoItems.length})
  </button>

  <button
    onClick={() => setMediaFilter("videos")}
    className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
      mediaFilter === "videos"
        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
        : "bg-[#171717] border border-[#262626] text-gray-400 hover:text-white"
    }`}
  >
    ▶ Videos ({videoItems.length})
  </button>

</div>

        {/* PHOTO GALLERY GRID */}
        {/* MEDIA GALLERY */}
<div className={`${role === "Admin" ? "lg:col-span-3" : "lg:col-span-4"}`}>

  {photoItems.length === 0 && videoItems.length === 0 ? (
    <div className="bg-[#111111] text-center py-20 rounded-3xl border border-dashed border-[#333333]">
      <p className="text-gray-500 font-medium">This event album is currently empty.</p>
      <p className="text-sm text-gray-400 mt-1">Images and videos uploaded by organizers will securely show up here.</p>
    </div>
  ) : (
    <div className="space-y-10">

      {filteredPhotos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Photos</h3>
            <span className="text-xs text-gray-400">{photoItems.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredPhotos.map((item) => (
              <div
                key={item._id}
                className="bg-[#111111] rounded-3xl overflow-hidden border border-[#222222] hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedMedia(item)}
              >
                <div className="aspect-square relative bg-[#0a0a0a] overflow-hidden p-2">
                  <img
                    src={item.s3_url}
                    alt="Event media asset"
                    className="object-cover w-full h-full rounded-2xl"
                  />
                </div>

                <div className="p-3 bg-[#111111] flex justify-between items-center text-xs">
                  <div className="flex gap-1 flex-wrap max-w-[70%]">
                    {item.tags.slice(0, 2).map((t, idx) => (
                      <span key={idx} className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded text-[10px] font-medium">
                        #{t}
                      </span>
                    ))}
                    {item.tags.length === 0 && (
                      <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded text-[10px] font-medium">
                        #untagged
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(item._id); }}
                    className="text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                  >
                    ❤️ {item.likes.length}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredVideos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Videos</h3>
            <span className="text-xs text-gray-400">{videoItems.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredVideos.map((item) => (
              <div
                key={item._id}
                className="bg-[#111111] rounded-3xl overflow-hidden border border-[#222222] hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedMedia(item)}
              >
                <div className="aspect-square relative bg-black overflow-hidden">
                  <video
                    src={item.s3_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute top-3 left-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full">
                    ▶ Video
                  </div>
                </div>

                <div className="p-3 bg-[#111111] flex justify-between items-center text-xs">
                  <div className="flex gap-1 flex-wrap max-w-[70%]">
                    <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-medium">
                      #video
                    </span>
                    {item.tags.length === 0 && (
                      <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded text-[10px] font-medium">
                        #untagged
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(item._id); }}
                    className="text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                  >
                    ❤️ {item.likes.length}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )}
</div>
      </div>

      {/* LIGHTBOX INTERACTIVE MODAL OVERLAY */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#222222] rounded-3xl overflow-hidden max-w-6xl w-full max-h-[90vh] grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] shadow-[0_0_60px_rgba(168,85,247,0.15)]">
            
            {/* LEFT SIDE: THE IMAGE DISPLAY */}
            <div className="bg-gray-950 flex items-center justify-center p-2 relative h-[40vh] md:h-auto">
              {selectedMedia.media_type === "video" ? (
  <video
    src={selectedMedia.s3_url}
    controls
    className="object-contain max-w-full max-h-[80vh]"  
  />
) : (
  <img
    src={selectedMedia.s3_url}
    alt="Lightbox view"
    className="object-contain max-w-full max-h-[80vh]"
  />
)}
              <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-md hover:bg-black"
              >
                ✕ Close Preview
              </button>

              {role === "Admin" && (
  <button
    onClick={() => handleDeleteMedia(selectedMedia._id)}
    disabled={deleting}
    className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded-md disabled:opacity-50"
  >
    {deleting ? "Deleting..." : "🗑 Delete"}
  </button>
)}
            </div>

            {/* RIGHT SIDE: COMMENTS AND METADATA */}
            <div className="p-6 flex flex-col justify-between overflow-y-auto max-h-[45vh] md:max-h-[90vh] border-l border-[#222222] bg-[#111111]">
              <div>
                <h4 className="font-bold text-white border-b border-gray-100 pb-3 text-md">Media Information</h4>
                
                {/* AI Generated Tag Section */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">AI Computer Vision Tags</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedMedia.tags.map((tag, idx) => (
                      <span key={idx} className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* --- NEW CORE FEATURE: WATERMARKED DOWNLOAD CONTROL --- */}
                <div className="mt-4">
                  <button
                    onClick={() => handleDownloadWithWatermark(selectedMedia.s3_url)}
                    disabled={downloading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-md transition flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-400"
                  >
                    📥 {downloading ? "Processing Watermark..." : "Download Watermarked Image"}
                  </button>
                </div>

                {/* Social Like Toggle */}
               <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">

              <span className="text-sm text-gray-600 font-medium">
    Liked by {selectedMedia.likes.length} member(s)
  </span>

  <div className="flex gap-2">

    <button
    aria-label="Like photo"
      onClick={() => handleLike(selectedMedia._id)}
      className="transition-all duration-200 hover:scale-105 active:scale-95 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition shadow-sm"
    >
      ❤️ Toggle Appreciation
    </button>

    <button
    aria-label="Favorite photo"
      onClick={() => handleFavorite(selectedMedia._id)}
      className="transition-all duration-200 hover:scale-105 active:scale-95 bg-white border border-gray-200 hover:border-yellow-200 hover:bg-yellow-50 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition shadow-sm"
    >
     {favoriteIds.includes(selectedMedia._id) ? "⭐ Favorited" : "☆ Favorite"}
  </button>
   
   <button
   aria-label="Share album"
  onClick={() => handleSharePhoto(selectedMedia._id)}
  className="transition-all duration-200 hover:scale-105 active:scale-95 bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition shadow-sm"
>
  📤 Share Photo
</button>

  </div>

</div>

                {/* Live Comments Thread Display */}
                <div className="mt-5">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Comments Thread ({selectedMedia.comments.length})</p>
                  <div className="space-y-2.5 max-h-[22vh] overflow-y-auto pr-1">
                    {selectedMedia.comments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No thoughts left here yet. Be the first!</p>
                    ) : (
                      selectedMedia.comments.map((comm, idx) => (
                        <div key={idx} className="bg-[#171717] p-3 rounded-xl border border-[#262626]">
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-tight">{comm.user_id.split("@")[0]}</p>
                          <p className="text-xs text-gray-300 mt-0.5">{comm.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Add Comment Input Field */}
              <form onSubmit={handleCommentSubmit} className="mt-4 border-t border-gray-100 pt-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your reflection..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 border border-[#262626] rounded-xl p-3 text-sm text-white bg-[#0f0f0f] focus:outline-none focus:border-purple-500"
                  />
                  <button type="submit" className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:scale-105 transition">
                    Post
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

{/* 📱 EVENT SPECIFIC QR MANAGEMENT OVERLAY MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col items-center relative animate-fade-in">
            
            {/* Close Button Trigger */}
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">
              Event Access QR Link
            </h3>
            <p className="text-xs text-gray-500 mb-6 text-center px-4">
              Scan this badge to route directly into the digital album matrix.
            </p>

            {/* QR Presenter Block */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex items-center justify-center shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/events/${eventId}`)}`}
                alt="Dynamic Access Identification matrix"
                className="w-[200px] h-[200px] object-contain rounded"
              />
            </div>

            {/* Role-Based Privileged Action Controls */}
            <div className="w-full flex flex-col gap-2">
              {role === "Admin" && (
                <button
                  onClick={handleDownloadQr}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  📥 Download High-Res PNG (Admin)
                </button>
              )}
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-xs transition text-center"
              >
                Dismiss View
              </button>
            </div>

          </div>
        </div>
      )}

      {showFindMeModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-[#111111] p-6 shadow-2xl">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Find My Photos
          </h2>

          <p className="text-gray-400 mt-1">
            Upload a selfie and we'll find photos containing you.
          </p>
        </div>

        <button
        aria-label="Close modal"
          onClick={() => setShowFindMeModal(false)}
          className="text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>

      <form
        onSubmit={handleFindMyPhotosSubmit}
        className="space-y-4"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setFindMeFile(
              e.target.files?.[0] || null
            )
          }
          className="block w-full text-sm text-gray-300"
        />

        <button
          type="submit"
          disabled={findMeLoading}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white font-medium disabled:opacity-50"
        >
          {findMeLoading
  ? "Finding Matches..."
  : "Find My Photos"}
        </button>
      </form>

      {findMeError && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300">
          {findMeError}
        </div>
      )}
      {findMeError === "No matching photos found." && (
  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
    <div className="text-4xl mb-3">🔍</div>

    <h3 className="text-white text-lg font-semibold">
      No matching photos found
    </h3>

    <p className="text-gray-400 mt-2">
      Try another selfie or upload more event photos.
    </p>
  </div>
)}  

      {findMeLoading && (
  <div className="mt-6">
    <h3 className="text-white font-semibold mb-4">
      Searching Photos...
    </h3>

    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-40 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
        />
      ))}
    </div>
  </div>
)}

      {findMeResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-semibold mb-4">
            Matching Photos
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {findMeResults.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  setSelectedMedia(item);
                  setShowFindMeModal(false);
                }}
                className="overflow-hidden rounded-2xl border border-white/10"
              >
                <img
                  src={item.s3_url}
                  alt="Matched Photo"
                  className="w-full h-40 object-cover hover:scale-105 transition"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}

{toastMessage && (
  <div className="fixed bottom-5 right-5 z-[9999] bg-[#111111] border border-purple-500 text-white px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)]">
    {toastMessage}
  </div>
)}
 
    </div>
  );
}