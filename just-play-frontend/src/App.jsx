import { useState, useEffect } from 'react'
import './App.css'

// --- GANTI URL INI DENGAN URL FUNCTION APP ANDA ---
const CATALOG_API_BASE = "https://func-catalog-just-play.azurewebsites.net/api"; 
const STREAM_API_BASE = "https://func-stream-just-play.azurewebsites.net/api";

function App() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);

  // 1. Load Lagu saat aplikasi dibuka
  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const res = await fetch(`${CATALOG_API_BASE}/getSongs`);
      const data = await res.json();
      setSongs(data);
    } catch (err) {
      console.error("Gagal ambil lagu:", err);
    }
  };

  // 2. Handle Upload (File ke Blob -> Metadata ke Mongo)
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return alert("Pilih file dan isi judul!");

    setUploading(true);
    try {
      // A. Upload File ke Stream Service
      const formData = new FormData();
      formData.append('file', file);

      const streamRes = await fetch(`${STREAM_API_BASE}/uploadFile`, {
        method: 'POST',
        body: formData
      });

      if (!streamRes.ok) throw new Error("Gagal upload file");
      const streamData = await streamRes.json();
      const songUrl = streamData.url; // Dapat URL Blob Storage

      // B. Simpan Metadata ke Catalog Service
      const metadataRes = await fetch(`${CATALOG_API_BASE}/addSong`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          artist: artist || "Unknown Artist",
          url: songUrl
        })
      });

      if (!metadataRes.ok) throw new Error("Gagal simpan metadata");

      // C. Reset Form & Refresh List
      alert("Upload Berhasil!");
      setTitle("");
      setArtist("");
      setFile(null);
      fetchSongs();

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🎵 Just Play</h1>
        <p>Cloud Streaming sederhana dengan Azure</p>
      </header>

      {/* PLAYER SECTION */}
      <div className="player-box">
        {currentSong ? (
          <>
            <h3>Sedang Memutar: {currentSong.title}</h3>
            <p>{currentSong.artist}</p>
            <audio controls autoPlay src={currentSong.url} className="audio-player">
              Browser Anda tidak mendukung audio element.
            </audio>
          </>
        ) : (
          <p>Pilih lagu untuk memutar</p>
        )}
      </div>

      <hr />

      {/* UPLOAD SECTION */}
      <div className="upload-section">
        <h3>Upload Lagu Baru</h3>
        <form onSubmit={handleUpload}>
          <input 
            type="text" 
            placeholder="Judul Lagu" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="Nama Artis" 
            value={artist} 
            onChange={e => setArtist(e.target.value)} 
          />
          <input 
            type="file" 
            accept="audio/*" 
            onChange={e => setFile(e.target.files[0])} 
            required 
          />
          <button type="submit" disabled={uploading}>
            {uploading ? "Mengunggah..." : "Upload MP3"}
          </button>
        </form>
      </div>

      <hr />

      {/* LIST SECTION */}
      <div className="playlist">
        <h3>Daftar Lagu</h3>
        {songs.length === 0 && <p>Belum ada lagu. Upload dulu!</p>}
        <ul>
          {songs.map((song) => (
            <li key={song._id} onClick={() => setCurrentSong(song)} className="song-item">
              <span className="play-icon">▶️</span>
              <div>
                <strong>{song.title}</strong>
                <br />
                <small>{song.artist}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App