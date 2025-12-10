import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'

// API Configuration
const CATALOG_API_BASE = "https://func-catalog-just-play.azurewebsites.net/api"; 
const STREAM_API_BASE = "https://func-stream-just-play.azurewebsites.net/api";
const ANALYTICS_API_BASE = "https://func-analytics-just-play.azurewebsites.net/api";

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(true);
  
  // Music State
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState(null);
  
  // Analytics State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('music');
  
  // Refs
  const audioRef = useRef(null);

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSongs();
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 1. Cek status awal (PENTING: untuk sinkronisasi saat Autoplay berjalan)
    setIsPlaying(!audio.paused);

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.volume = volume;
      // Pastikan state sync saat metadata termuat
      setIsPlaying(!audio.paused);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNext();
      }
    };

    // Handler sederhana untuk sync state & analytics
    const onPlay = () => {
      setIsPlaying(true);
      if (currentSong) trackEvent("play", currentSong._id);
    };

    const onPause = () => {
      setIsPlaying(false);
      if (currentSong) trackEvent("pause", currentSong._id);
    };

    // Pasang Event Listeners
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    // Cleanup saat unmount atau saat lagu berganti
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
    
    // PERBAIKAN UTAMA: Tambahkan 'currentSong' ke dependency array
    // Agar listener diperbarui setiap kali lagu berganti
  }, [currentSong, isLooping, volume]);

  // Authentication Functions
  const handleLogin = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (username && password) {
      const user = {
        id: `user_${Date.now()}`,
        username: username
      };
      setCurrentUser(user);
      setIsAuthenticated(true);
      setShowLoginModal(false);
    } else {
      alert('Please enter both username and password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLoginModal(true);
    setCurrentSong(null);
    setCurrentIndex(-1);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Data Fetching Functions
  const fetchSongs = async () => {
    try {
      const response = await fetch(`${CATALOG_API_BASE}/getSongs`);
      const data = await response.json();
      setSongs(data);
    } catch (error) {
      console.error("Failed to fetch songs:", error);
    }
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const response = await fetch(`${ANALYTICS_API_BASE}/events`);
      const data = await response.json();
      setAnalyticsData(data || []);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setAnalyticsData([]);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Analytics Functions
  const trackEvent = async (eventType, songId) => {
    try {
      const payload = {
        songId,
        event: eventType,
        userId: currentUser?.id
      };

      await fetch(`${ANALYTICS_API_BASE}/trackEvent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // refresh analytics panel shortly after
      setTimeout(fetchAnalytics, 500);
    } catch (error) {
      console.error("Analytics tracking failed:", error);
    }
  };

  // Music Player Functions
  const playSong = async (song, index) => {
    // set state first
    setCurrentSong(song);
    setCurrentIndex(index);

    // try to play audio after state update/render
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        // attempt to play; ignore promise rejection (autoplay policies)
        audio.play().catch(() => {});
      }
    }, 80);

    // minimal: keep awaiting trackEvent (your original behavior)
    await trackEvent('play', song._id);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    // Cek status asli elemen audio, bukan state React
    if (audio.paused) {
      audio.play().catch((err) => console.error("Play error:", err));
      // State akan otomatis berubah jadi TRUE lewat event listener 'play'
    } else {
      audio.pause();
      // State akan otomatis berubah jadi FALSE lewat event listener 'pause'
    }
  };

  const handlePrevious = async () => {
    if (songs.length === 0) return;
    
    const newIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    const prevSong = songs[newIndex];
    
    setCurrentSong(prevSong);
    setCurrentIndex(newIndex);
      
    await trackEvent("skip", currentSong?._id);  // skip lagu sekarang
    await trackEvent("play", prevSong._id);      // play lagu baru
  };

  const handleNext = async () => {
    if (songs.length === 0) return;
    
    const newIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
    const nextSong = songs[newIndex];
    
    setCurrentSong(nextSong);
    setCurrentIndex(newIndex);
    
    await trackEvent("skip", currentSong?._id);
    await trackEvent("play", nextSong._id);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audio.currentTime = newTime;
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Upload Functions
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return alert("Please select file and enter title!");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const streamRes = await fetch(`${STREAM_API_BASE}/uploadFile`, {
        method: 'POST',
        body: formData
      });

      if (!streamRes.ok) throw new Error("Failed to upload file");
      const streamData = await streamRes.json();
      const songUrl = streamData.url;

      const metadataRes = await fetch(`${CATALOG_API_BASE}/addSong`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          artist: artist || "Unknown Artist",
          url: songUrl
        })
      });

      if (!metadataRes.ok) throw new Error("Failed to save metadata");

      alert("Upload successful!");
      setTitle("");
      setArtist("");
      setFile(null);
      fetchSongs();

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Utility Functions
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSongTitle = (songId) => {
    const song = songs.find(s => s._id === songId);
    return song ? song.title : 'Unknown Song';
  };

  // compute Top Played (most played) from analyticsData (frontend-only)
  const topPlayed = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return [];

    const counts = {};
    for (const ev of analyticsData) {
      if (!ev || ev.event !== 'play' || !ev.songId) continue;
      counts[ev.songId] = (counts[ev.songId] || 0) + 1;
    }

    const arr = Object.entries(counts).map(([songId, count]) => {
      const s = songs.find(x => x._id === songId) || {};
      return {
        songId,
        count,
        title: s.title || 'Unknown Song',
        artist: s.artist || 'Unknown Artist',
        url: s.url || ''
      };
    });

    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [analyticsData, songs]);

  // Login Modal Component
  if (!isAuthenticated) {
    return (
      <div className="login-overlay">
        <div className="login-container">
          <div className="login-header">
            <h1>🎵 Just Play</h1>
            <p>Your Premium Music Experience</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <input 
                name="username" 
                type="text" 
                placeholder="Username" 
                required 
              />
            </div>
            <div className="input-group">
              <input 
                name="password" 
                type="password" 
                placeholder="Password" 
                required 
              />
            </div>
            <button type="submit" className="login-btn">
              Enter Music World
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>🎵 Just Play</h1>
          </div>
          <nav className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'music' ? 'active' : ''}`}
              onClick={() => setActiveTab('music')}
            >
              Music Library
            </button>
            <button 
              className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload
            </button>
            <button 
              className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('analytics');
                fetchAnalytics();
              }}
            >
              Analytics
            </button>
          </nav>
          <div className="user-section">
            <span className="welcome">Welcome, {currentUser?.username}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main>
        <div className="main-wrapper">
          <div className="main-content">

            {/* Music Library Tab */}
            {activeTab === 'music' && (
              <div className="music-library">
                <div className="section-header">
                  <h2>Your Music Collection</h2>
                  <span className="song-count">{songs.length} tracks</span>
                </div>
                
                {songs.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🎵</div>
                    <h3>No music yet</h3>
                    <p>Upload your first track to get started</p>
                  </div>
                ) : (
                  <div className="songs-grid">
                    {songs.map((song, index) => (
                      <div 
                        key={song._id} 
                        className={`song-card ${currentSong?._id === song._id ? 'playing' : ''}`}
                        onClick={() => playSong(song, index)}
                      >
                        <div className="song-artwork">
                          <div className="play-overlay">
                            <div className="play-button">
                              {currentSong?._id === song._id && isPlaying ? '⏸️' : '▶️'}
                            </div>
                          </div>
                        </div>
                        <div className="song-info">
                          <h3 className="song-title">{song.title}</h3>
                          <p className="song-artist">{song.artist}</p>
                        </div>
                        {currentSong?._id === song._id && (
                          <div className="now-playing-indicator">
                            <div className="sound-wave">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="upload-section">
                <div className="section-header">
                  <h2>Upload New Track</h2>
                  <p>Share your music with the world</p>
                </div>
                
                <form onSubmit={handleUpload} className="upload-form">
                  <div className="form-grid">
                    <div className="input-group">
                      <label>Track Title</label>
                      <input 
                        type="text" 
                        placeholder="Enter song title" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label>Artist Name</label>
                      <input 
                        type="text" 
                        placeholder="Enter artist name" 
                        value={artist} 
                        onChange={e => setArtist(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="file-upload-area">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={e => setFile(e.target.files[0])}
                      required 
                      id="file-input"
                      className="file-input"
                    />
                    <label htmlFor="file-input" className="file-label">
                      <div className="upload-icon">📁</div>
                      <span>{file ? file.name : 'Choose audio file'}</span>
                      <small>MP3, WAV, FLAC supported</small>
                    </label>
                  </div>
                  
                  <button type="submit" disabled={uploading} className="upload-btn">
                    {uploading ? (
                      <>
                        <span className="spinner"></span>
                        Uploading...
                      </>
                    ) : (
                      'Upload Track'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="analytics-section">
                <div className="section-header">
                  <h2>Analytics Dashboard</h2>
                  <div className="analytics-header-actions">
                    <button onClick={fetchAnalytics} className="refresh-btn">🔄 Refresh</button>
                    <small className="analytics-counter">Showing last {analyticsData.length} events (up to 100)</small>
                  </div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading analytics data...</p>
                  </div>
                ) : (
                  <>
                    {/* TOP PLAYED TRACKS - Dark Premium Cards */}
                    <div className="top-played-section">
                      <h3 className="analytics-section-title">🎧 Top Played Tracks</h3>

                      {topPlayed.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">📊</div>
                          <p>No play data yet.</p>
                        </div>
                      ) : (
                        <div className="top-played-grid">
                          {topPlayed.map((item, idx) => (
                            <div key={item.songId} className="top-played-card">
                              <div className="ranking-badge">
                                #{idx + 1}
                              </div>

                              <div className="track-details">
                                <div className="track-title">{item.title}</div>
                                <div className="track-artist">{item.artist}</div>
                                <div className="play-count">
                                  <strong>{item.count}</strong> plays
                                </div>
                              </div>

                              <div className="card-play-button">
                                <button
                                  className="play-btn-card"
                                  onClick={() => {
                                    const songObj = songs.find(s => s._id === item.songId);
                                    if (songObj) playSong(songObj, songs.indexOf(songObj));
                                  }}
                                >
                                  ▶
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RECENT EVENTS TABLE - Dark Premium Table */}
                    <div className="recent-events-section">
                      <h4 className="analytics-section-title">Recent Events</h4>
                      {analyticsData.length === 0 ? (
                        <div className="no-events">No recent events.</div>
                      ) : (
                        <div className="analytics-data-table">
                          <div className="table-header-dark">
                            <div className="header-cell">Song</div>
                            <div className="header-cell">Action</div>
                            <div className="header-cell">User</div>
                            <div className="header-cell">Timestamp</div>
                          </div>
                          <div className="table-body-dark">
                            {analyticsData.slice(0, 50).map((event) => (
                              <div key={event._id} className="table-row-dark">
                                <div className="data-cell song-cell-dark">
                                  <strong>{getSongTitle(event.songId)}</strong>
                                </div>
                                <div className="data-cell action-cell-dark">
                                  <span className={`event-badge event-${event.event}`}>
                                    {event.event === 'play' && '▶️ Play'}
                                    {event.event === 'pause' && '⏸️ Pause'}
                                    {event.event === 'skip' && '⏭️ Skip'}
                                    {!['play','pause','skip'].includes(event.event) && event.event}
                                  </span>
                                </div>
                                <div className="data-cell user-cell-dark">{event.userId}</div>
                                <div className="data-cell time-cell-dark">{formatDate(event.timestamp)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Music Player Footer - Always Sticky at Bottom */}
      {currentSong && (
        <footer className="player-footer">
          <audio ref={audioRef} src={currentSong.url} autoPlay />
          <div className="player-container">
            {/* Now Playing Info */}
            <div className="now-playing-info">
              <div className="song-artwork-mini">
                <div className="artwork-placeholder">🎵</div>
              </div>
              <div className="track-info">
                <h4>{currentSong.title}</h4>
                <p>{currentSong.artist}</p>
              </div>
            </div>

            {/* Player Controls */}
            <div className="player-controls">
              <div className="control-buttons">
                <button className="control-btn" onClick={handlePrevious}>
                  ⏮️
                </button>
                <button className="play-pause-btn" onClick={togglePlayPause}>
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button className="control-btn" onClick={handleNext}>
                  ⏭️
                </button>
                <button 
                  className={`control-btn ${isLooping ? 'active' : ''}`} 
                  onClick={toggleLoop}
                >
                  🔁
                </button>
              </div>
              
              <div className="progress-container">
                <span className="time-display">{formatTime(duration * (progress / 100))}</span>
                <div className="progress-bar" onClick={handleProgressClick}>
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="time-display">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="volume-control">
              <span className="volume-icon">🔊</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume * 100}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
