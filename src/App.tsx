import React, { useState, useEffect, useRef } from 'react';
import ChristmasCanvas from './components/ChristmasCanvas';
import { VisionResult, AppMode } from './types';
import { Camera, Hand, Sparkles, Edit3, Volume2, VolumeX } from 'lucide-react';

const WISHES = [
  "Giáng Sinh An Lành",
  "Hạnh Phúc Tràn Đầy",
  "Ấm Áp Bên Gia Đình",
  "Vạn Sự Như Ý",
  "Niềm Vui Ngập Tràn",
  "Tình Yêu Thăng Hoa",
  "Năm Mới Bình An",
  "Sức Khỏe Dồi Dào"
];

// Using local file from public directory
const AUDIO_URL = "./nhac-noel.mp3";

export default function App() {
  const [visionState, setVisionState] = useState<VisionResult>({ gesture: 'None', isPresent: false });
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [loading, setLoading] = useState(true);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [recipientName, setRecipientName] = useState<string>("");
  const [currentWish, setCurrentWish] = useState(WISHES[0]);

  // Music State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Use a ref to keep the audio instance persistent without re-rendering
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // LOCK: Prevents play/pause race conditions
  const audioLock = useRef(false);

  // Initialize Audio
  useEffect(() => {
    // Create Audio instance only once
    const audio = new Audio(AUDIO_URL);
    audio.loop = true;
    audio.volume = 0.5; // Moderate volume
    // Removed crossOrigin for local file to avoid potential issues

    audioRef.current = audio;

    // Error handling
    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      // Detailed error logging
      const code = target.error ? target.error.code : 'Unknown';
      const message = target.error ? target.error.message : 'Network/Format Error';
      console.error(`Audio Load Error (Code ${code}): ${message}`, target.src);
      setIsMusicPlaying(false);
    };
    audio.addEventListener('error', handleError);

    // Cleanup on unmount
    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Safe Play Function (Protected by Lock)
  const playAudio = async () => {
    if (!audioRef.current || audioLock.current) return;

    try {
      audioLock.current = true;
      await audioRef.current.play();
      setIsMusicPlaying(true);
    } catch (err: any) {
      // Ignore AbortError (happens if paused while loading or navigating away)
      if (err.name !== 'AbortError') {
        console.warn("Audio playback failed:", err);
      }
      setIsMusicPlaying(false);
    } finally {
      audioLock.current = false;
    }
  };

  // Safe Pause Function (Protected by Lock)
  const pauseAudio = () => {
    if (!audioRef.current || audioLock.current) return;

    try {
      audioLock.current = true;
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } finally {
      audioLock.current = false;
    }
  };

  // Toggle Handler
  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      playAudio();
    } else {
      pauseAudio();
    }
  };

  // Cycle through wishes
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * WISHES.length);
      setCurrentWish(WISHES[randomIndex]);
    }, 4000); // Change every 4 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Determine mode based on gesture
    if (visionState.gesture === 'Closed_Fist') {
      setMode(AppMode.TREE);
    } else if (visionState.gesture === 'Open_Palm') {
      setMode(AppMode.SPHERE);
    }
  }, [visionState.gesture]);

  const handleCameraStart = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking permission
        setCameraAllowed(true);
        setLoading(false);

        // Auto-play music using Safe Play
        playAudio();
      })
      .catch((err) => {
        console.error("Camera denied:", err);
        setLoading(false);
      });
  };

  return (
    <div className="relative w-full h-screen text-white overflow-hidden font-sans">

      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        {cameraAllowed && (
          <ChristmasCanvas
            targetMode={mode}
            onVisionUpdate={setVisionState}
          />
        )}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">

        {/* TOP SECTION: Wishes */}
        <div className="w-full flex flex-col items-center pt-8 pointer-events-auto">
          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] mb-2 animate-pulse" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
            {currentWish}
          </h1>

          {/* Recipient Name Display */}
          <div className="h-12 flex items-center justify-center">
            {recipientName && (
              <div className="text-2xl md:text-3xl text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all duration-500">
                Gửi tặng: <span className="text-red-400">{recipientName}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT TOP: Status Indicators & Music */}
        <div className="absolute top-6 right-6 pointer-events-auto flex flex-col gap-4 items-end">

          {/* Music Toggle */}
          <button
            onClick={toggleMusic}
            disabled={audioLock.current} // Disable button if locked
            className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 shadow-lg ${isMusicPlaying ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-black/40'}`}
          >
            {isMusicPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Status Box */}
          <div className="hidden md:flex bg-black/20 backdrop-blur-md p-3 rounded-lg border border-white/10 flex-col gap-2 items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-400">Chế độ</span>
              <span className={`font-bold px-2 py-0.5 rounded text-sm transition-colors duration-500 ${mode === AppMode.SPHERE ? 'bg-blue-500/50 text-blue-100' : 'bg-green-500/50 text-green-100'}`}>
                {mode === AppMode.SPHERE ? 'QUẢ CẦU' : 'CÂY THÔNG'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Hand className="w-3 h-3" />
              <span>{visionState.isPresent ? (visionState.gesture === 'Closed_Fist' ? 'Nắm tay ✊' : 'Mở tay ✋') : '...'}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Controls & Instructions */}
        <div className="w-full flex flex-col items-center gap-3 pointer-events-auto pb-6">

          {/* Name Input (Compact) */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-black/60 transition-colors">
            <Edit3 className="w-4 h-4 text-gray-300" />
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Nhập tên người nhận..."
              className="bg-transparent border-none text-sm md:text-base focus:outline-none text-white placeholder-gray-400 w-40 md:w-56"
            />
          </div>

          {/* Gesture Instructions */}
          {cameraAllowed && (
            <div className="inline-block bg-black/20 backdrop-blur-sm px-6 py-1.5 rounded-full border border-white/5 text-gray-300 text-xs md:text-sm">
              Giơ tay trước camera: <strong>Nắm tay</strong> ✊ (Cây) hoặc <strong>Mở tay</strong> ✋ (Cầu)
            </div>
          )}

          {/* Signature / Copyright Footer */}
          <div className="mt-2 text-center px-4 animate-fade-in-up">
            <p className="text-yellow-400 text-lg md:text-2xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide leading-relaxed" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
              Thiệp được sáng tạo bởi DangHoang (DHsystem); <br className="md:hidden" />
              <span className="text-white/90">chúc mọi người một mùa giáng sinh an lành</span>
            </p>
          </div>
        </div>

        {/* Start Screen / Instructions Modal */}
        {!cameraAllowed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 pointer-events-auto z-50">
            <div className="max-w-md text-center p-8 bg-gray-900/80 backdrop-blur-lg rounded-2xl border border-gray-700 shadow-2xl">
              <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-spin-slow" />
              <h2 className="text-3xl font-bold mb-4 text-white font-serif">Giáng Sinh Diệu Kỳ</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Trải nghiệm thiệp 3D tương tác.
                <br />
                Hãy cho phép truy cập Camera để điều khiển.
              </p>
              <button
                onClick={handleCameraStart}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(220,38,38,0.5)]"
              >
                <Camera className="w-5 h-5" />
                Bắt đầu Trải nghiệm
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}