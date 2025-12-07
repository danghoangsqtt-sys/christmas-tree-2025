import React, { useState, useEffect, useRef } from 'react';
import ChristmasCanvas from './components/ChristmasCanvas';
import { VisionResult, AppMode } from './types';
import { Camera, Hand, Sparkles, Edit3, Volume2, VolumeX, QrCode, X, Link as LinkIcon, Check } from 'lucide-react';

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

// Production Domain
const PROD_DOMAIN = "https://christmas-tree-2025-moko.vercel.app/";

export default function App() {
  const [visionState, setVisionState] = useState<VisionResult>({ gesture: 'None', isPresent: false });
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [loading, setLoading] = useState(true);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [recipientName, setRecipientName] = useState<string>("");
  const [currentWish, setCurrentWish] = useState(WISHES[0]);

  // Recipient / QR Mode State
  const [isRecipientMode, setIsRecipientMode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

    audioRef.current = audio;

    // Error handling
    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
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

  // Check URL parameters for recipient name (ROBUST CHECK)
  useEffect(() => {
    const getRecipientFromUrl = () => {
      // 1. Check Standard Search Params (?to=...)
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('to')) {
        return searchParams.get('to');
      }

      // 2. Check Hash Params (#/?to=... or #to=...)
      // Some redirects or routers might put params after the hash
      if (window.location.hash.includes('?')) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
          const hashParams = new URLSearchParams(hashParts[1]);
          if (hashParams.has('to')) return hashParams.get('to');
        }
      }

      return null;
    };

    const toParam = getRecipientFromUrl();
    if (toParam && toParam.trim() !== '') {
      console.log("Recipient Detected:", toParam);
      setRecipientName(toParam);
      setIsRecipientMode(true);
    }
  }, []);

  // Safe Play Function (Protected by Lock)
  const playAudio = async () => {
    if (!audioRef.current || audioLock.current) return;

    try {
      audioLock.current = true;
      await audioRef.current.play();
      setIsMusicPlaying(true);
    } catch (err: any) {
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

  const getShareUrl = () => {
    const url = new URL(PROD_DOMAIN);
    if (recipientName) {
      url.searchParams.set('to', recipientName);
    }
    return url.toString();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

          {/* Recipient Name Display - Context Aware */}
          <div className="h-16 flex items-center justify-center">
            {isRecipientMode ? (
              // DISPLAY FOR RECIPIENT
              <div className="text-center animate-fade-in-up">
                <p className="text-lg text-gray-200 font-serif italic mb-1">Dành tặng cho</p>
                <div className="text-3xl md:text-5xl text-white font-bold drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
                  {recipientName}
                </div>
              </div>
            ) : (
              // DISPLAY FOR SENDER (Preview)
              recipientName && (
                <div className="text-xl md:text-2xl text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-80">
                  Đang viết thiệp cho: <span className="text-yellow-300">{recipientName}</span>
                </div>
              )
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

          {/* Show controls ONLY if not in Recipient Mode */}
          {!isRecipientMode && (
            <div className="flex items-center gap-2 animate-fade-in">
              {/* Name Input */}
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

              {/* QR Generation Button */}
              <button
                onClick={() => {
                  if (recipientName.trim()) setShowQRModal(true);
                  else alert("Vui lòng nhập tên người nhận trước khi tạo thiệp!");
                }}
                className="p-2.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 rounded-full border border-yellow-400/30 backdrop-blur-md transition-all"
                title="Tạo mã QR thiệp"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          )}

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

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto z-50 animate-fade-in">
            <div className="relative max-w-sm w-full mx-4 p-6 bg-gray-900/90 rounded-2xl border border-yellow-500/30 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-yellow-400 mb-2" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>Chia Sẻ Thiệp</h3>
                <p className="text-gray-300 text-sm mb-4">Quét mã QR để xem thiệp dành cho <br /><span className="text-white font-bold text-lg">{recipientName}</span></p>

                <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4">
                  {/* Using QR Server API */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getShareUrl())}`}
                    alt="QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded mb-4">
                  <p className="text-xs text-yellow-200">
                    Lưu ý: Mã QR này dẫn đến trang web chính thức ({PROD_DOMAIN}).
                    <br />
                    <strong>Hãy đảm bảo bạn đã cập nhật code mới nhất lên Vercel để tính năng hoạt động.</strong>
                  </p>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2.5 px-4 rounded-lg transition-all"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <LinkIcon className="w-5 h-5" />}
                  {copied ? "Đã sao chép liên kết!" : "Sao chép liên kết thiệp"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}