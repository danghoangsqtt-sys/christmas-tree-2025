import React, { useState, useEffect, useRef } from 'react';
import ChristmasCanvas from './components/ChristmasCanvas';
import { VisionResult, AppMode, Gift, STICKERS } from './types';
import { Camera, Hand, Sparkles, Edit3, Volume2, VolumeX, QrCode, X, Link as LinkIcon, Check, Gift as GiftIcon, Plus, Trash2, Download, CircleHelp } from 'lucide-react';

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

  // Help Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);

  // GIFT FEATURE STATE
  // Sender State
  const [giftList, setGiftList] = useState<Gift[]>([]);
  const [giftInputMsg, setGiftInputMsg] = useState("");
  const [giftInputSticker, setGiftInputSticker] = useState(STICKERS[0]);
  const [showGiftBuilder, setShowGiftBuilder] = useState(false);

  // Recipient State
  const [unopenedGifts, setUnopenedGifts] = useState<Gift[]>([]);
  const [activeGift, setActiveGift] = useState<Gift | null>(null);

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

  // Check URL parameters for recipient name AND GIFTS
  useEffect(() => {
    const getParams = () => {
      // 1. Check Standard Search Params (?to=...)
      const searchParams = new URLSearchParams(window.location.search);
      let to = searchParams.get('to');
      let giftsStr = searchParams.get('gifts');

      // 2. Check Hash Params (#/?to=... or #to=...)
      if (window.location.hash.includes('?')) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
          const hashParams = new URLSearchParams(hashParts[1]);
          if (hashParams.has('to')) to = hashParams.get('to');
          if (hashParams.has('gifts')) giftsStr = hashParams.get('gifts');
        }
      }
      return { to, giftsStr };
    };

    const { to, giftsStr } = getParams();

    if (to && to.trim() !== '') {
      console.log("Recipient Detected:", to);
      setRecipientName(to);
      setIsRecipientMode(true);
    }

    if (giftsStr) {
      try {
        const parsedGifts = JSON.parse(decodeURIComponent(giftsStr));
        if (Array.isArray(parsedGifts) && parsedGifts.length > 0) {
          console.log("Gifts received:", parsedGifts);
          setUnopenedGifts(parsedGifts);
        }
      } catch (e) {
        console.error("Failed to parse gifts", e);
      }
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

  // --- LOGIC: Mode Switching & Gift Opening ---
  useEffect(() => {
    // Determine mode based on gesture
    if (visionState.gesture === 'Closed_Fist') {
      setMode(AppMode.TREE);
      // Close gift if open
      if (activeGift) {
        setActiveGift(null);
      }
    } else if (visionState.gesture === 'Open_Palm') {
      setMode(AppMode.SPHERE);

      // Open a random gift if available and not already showing one
      if (!activeGift && unopenedGifts.length > 0) {
        const randomIndex = Math.floor(Math.random() * unopenedGifts.length);
        const selectedGift = unopenedGifts[randomIndex];

        setActiveGift(selectedGift);

        // Remove from unopened list
        const newList = [...unopenedGifts];
        newList.splice(randomIndex, 1);
        setUnopenedGifts(newList);
      }
    }
  }, [visionState.gesture]); // removed deps to prevent loop, relying on visionState update

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

  // --- SENDER: Gift Management ---
  const addGift = () => {
    if (!giftInputMsg.trim()) return;
    const newGift: Gift = {
      id: Date.now().toString(),
      message: giftInputMsg,
      sticker: giftInputSticker
    };
    setGiftList([...giftList, newGift]);
    setGiftInputMsg("");
  };

  const removeGift = (id: string) => {
    setGiftList(giftList.filter(g => g.id !== id));
  };

  const getShareUrl = () => {
    const url = new URL(PROD_DOMAIN);
    if (recipientName) {
      url.searchParams.set('to', recipientName);
    }
    if (giftList.length > 0) {
      const json = JSON.stringify(giftList);
      url.searchParams.set('gifts', encodeURIComponent(json));
    }
    return url.toString();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&format=png&data=${encodeURIComponent(getShareUrl())}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const safeName = recipientName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'friend';
      a.download = `thiep-giang-sinh-${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
      alert('Không thể tải ảnh. Vui lòng thử lại.');
    }
  };

  return (
    <div className="relative w-full h-screen text-white overflow-hidden font-sans">

      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        {cameraAllowed && (
          <ChristmasCanvas
            targetMode={mode}
            onVisionUpdate={setVisionState}
            activeGift={activeGift} // Pass the active gift to 3D scene
          />
        )}
      </div>

      {/* Gift Overlay (Text) */}
      {activeGift && mode === AppMode.SPHERE && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none animate-fade-in-up">
          <div className="mt-32 md:mt-48 p-6 text-center">
            <div className="text-6xl md:text-8xl mb-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-bounce">
              {activeGift.sticker}
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,1)] bg-black/40 backdrop-blur-md px-6 py-4 rounded-xl border border-yellow-500/50" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
              {activeGift.message}
            </h2>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">

        {/* TOP SECTION: Wishes */}
        <div className="w-full flex flex-col items-center pt-8 pointer-events-auto">
          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] mb-2 animate-pulse" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
            {currentWish}
          </h1>

          {/* Recipient Name Display */}
          <div className="h-16 flex items-center justify-center">
            {isRecipientMode ? (
              <div className="text-center animate-fade-in-up">
                <p className="text-lg text-gray-200 font-serif italic mb-1">Dành tặng cho</p>
                <div className="text-3xl md:text-5xl text-white font-bold drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
                  {recipientName}
                </div>
              </div>
            ) : (
              recipientName && (
                <div className="text-xl md:text-2xl text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-80">
                  Đang viết thiệp cho: <span className="text-yellow-300">{recipientName}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT TOP: Status & Controls */}
        <div className="absolute top-6 right-6 pointer-events-auto flex flex-col gap-4 items-end">
          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-3 rounded-full backdrop-blur-md border bg-black/20 border-white/10 text-gray-400 hover:bg-black/40 hover:text-white transition-all shadow-lg"
            title="Hướng dẫn sử dụng"
          >
            <CircleHelp className="w-5 h-5" />
          </button>

          <button
            onClick={toggleMusic}
            disabled={audioLock.current}
            className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 shadow-lg ${isMusicPlaying ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-black/40'}`}
          >
            {isMusicPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <div className="hidden md:flex bg-black/20 backdrop-blur-md p-3 rounded-lg border border-white/10 flex-col gap-2 items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-400">Chế độ</span>
              <span className={`font-bold px-2 py-0.5 rounded text-sm transition-colors duration-500 ${mode === AppMode.SPHERE ? 'bg-blue-500/50 text-blue-100' : 'bg-green-500/50 text-green-100'}`}>
                {mode === AppMode.SPHERE ? 'MỞ QUÀ' : 'CÂY THÔNG'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Hand className="w-3 h-3" />
              <span>{visionState.isPresent ? (visionState.gesture === 'Closed_Fist' ? 'Nắm tay ✊' : 'Mở tay ✋') : '...'}</span>
            </div>
            {isRecipientMode && unopenedGifts.length > 0 && (
              <div className="text-xs text-yellow-300 font-bold border-t border-white/10 pt-1 mt-1">
                🎁 Còn {unopenedGifts.length} quà chưa mở!
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: Controls */}
        <div className="w-full flex flex-col items-center gap-3 pointer-events-auto pb-6">

          {/* SENDER TOOLS */}
          {!isRecipientMode && (
            <div className="flex flex-col items-center gap-3 animate-fade-in w-full max-w-lg">

              <div className="flex items-center gap-2">
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

                {/* Open Gift Builder */}
                <button
                  onClick={() => setShowGiftBuilder(true)}
                  className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-full border border-red-400/30 backdrop-blur-md transition-all relative"
                  title="Thêm hộp quà"
                >
                  <GiftIcon className="w-5 h-5" />
                  {giftList.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                      {giftList.length}
                    </span>
                  )}
                </button>

                {/* QR Gen */}
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
            </div>
          )}

          {/* Gesture Instructions */}
          {cameraAllowed && (
            <div className="inline-block bg-black/20 backdrop-blur-sm px-6 py-1.5 rounded-full border border-white/5 text-gray-300 text-xs md:text-sm">
              {isRecipientMode && unopenedGifts.length > 0
                ? <span>Mở tay ✋ để <strong className="text-yellow-400">NHẬN QUÀ</strong> • Nắm tay ✊ để đóng hộp</span>
                : <span>Giơ tay trước camera: <strong>Nắm tay</strong> ✊ (Cây) hoặc <strong>Mở tay</strong> ✋ (Cầu)</span>
              }
            </div>
          )}

          {/* Signature */}
          <div className="mt-2 text-center px-4 animate-fade-in-up">
            <p className="text-yellow-400 text-lg md:text-2xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide leading-relaxed" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
              Thiệp được sáng tạo bởi DangHoang (DHsystem); <br className="md:hidden" />
              <span className="text-white/90">chúc mọi người một mùa giáng sinh an lành</span>
            </p>
          </div>
        </div>

        {/* Start Modal */}
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

        {/* HELP MODAL */}
        {showHelpModal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto z-50 animate-fade-in p-4">
            <div className="relative max-w-2xl w-full bg-gray-900/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
                  <CircleHelp className="w-6 h-6" /> Hướng Dẫn Sử Dụng
                </h2>
                <button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                {isRecipientMode ? (
                  // Recipient Content (Người nhận)
                  <div className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-blue-300 mb-2">👋 Chào bạn, {recipientName}!</h3>
                      <p className="text-gray-300 text-sm">Bạn vừa nhận được một tấm thiệp 3D tương tác đặc biệt. Hãy làm theo các bước sau để khám phá nhé.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors">
                        <div className="text-4xl mb-3 text-center">✋</div>
                        <h4 className="font-bold text-yellow-300 mb-1 text-center">Mở Quà (Open Palm)</h4>
                        <p className="text-gray-400 text-sm text-center">Giơ bàn tay <strong>MỞ</strong> trước camera để biến cây thông thành cầu tuyết và mở các hộp quà bí mật.</p>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors">
                        <div className="text-4xl mb-3 text-center">✊</div>
                        <h4 className="font-bold text-red-300 mb-1 text-center">Xem Cây Thông (Closed Fist)</h4>
                        <p className="text-gray-400 text-sm text-center">Giơ bàn tay <strong>NẮM</strong> lại để quay về trạng thái cây thông Noel lấp lánh.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                      <Volume2 className="w-5 h-5 text-green-400 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-green-300">Âm nhạc</h4>
                        <p className="text-gray-400 text-sm">Bấm vào biểu tượng loa góc trên bên phải để bật/tắt nhạc Giáng sinh.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Sender Content (Người tặng)
                  <div className="space-y-6">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-purple-300 mb-2">✨ Tạo Thiệp Giáng Sinh 3D</h3>
                      <p className="text-gray-300 text-sm">Tạo ra món quà tinh thần độc đáo tặng bạn bè chỉ với vài bước đơn giản.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold border border-yellow-500/50 shrink-0">1</div>
                        <div>
                          <h4 className="font-bold text-white">Nhập tên người nhận</h4>
                          <p className="text-gray-400 text-sm">Điền tên bạn bè vào ô "Nhập tên người nhận" ở thanh công cụ phía dưới.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold border border-red-500/50 shrink-0">2</div>
                        <div>
                          <h4 className="font-bold text-white">Thêm lời chúc & Quà</h4>
                          <p className="text-gray-400 text-sm">Nhấn nút <GiftIcon className="w-4 h-4 inline mx-1" /> để mở hộp thoại thêm quà. Viết lời chúc và chọn Sticker ngẫu nhiên.</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold border border-blue-500/50 shrink-0">3</div>
                        <div>
                          <h4 className="font-bold text-white">Chia sẻ</h4>
                          <p className="text-gray-400 text-sm">Nhấn nút QR <QrCode className="w-4 h-4 inline mx-1" /> để tạo mã QR hoặc sao chép liên kết gửi cho bạn bè.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <h4 className="font-bold text-gray-300 mb-3 text-sm uppercase tracking-wider">Cách tương tác (Gesture)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center bg-black/20 p-3 rounded-lg border border-white/5">
                          <span className="text-2xl block mb-1">✋</span>
                          <span className="text-xs text-gray-400">Mở tay: Chế độ Cầu Tuyết</span>
                        </div>
                        <div className="text-center bg-black/20 p-3 rounded-lg border border-white/5">
                          <span className="text-2xl block mb-1">✊</span>
                          <span className="text-xs text-gray-400">Nắm tay: Chế độ Cây Thông</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-white/5 text-center">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-8 py-2 rounded-full font-semibold transition-all"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GIFT BUILDER MODAL */}
        {showGiftBuilder && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto z-50 animate-fade-in">
            <div className="relative max-w-md w-full mx-4 p-6 bg-gray-900/95 rounded-2xl border border-red-500/30 shadow-[0_0_30px_rgba(255,0,0,0.2)] flex flex-col max-h-[90vh]">
              <button
                onClick={() => setShowGiftBuilder(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <GiftIcon className="w-6 h-6" /> Thiết Lập Hộp Quà
              </h3>

              <div className="flex-1 overflow-y-auto mb-4">
                {/* Input Area */}
                <div className="bg-white/5 p-4 rounded-xl mb-4">
                  <label className="text-xs text-gray-400 block mb-2">Chọn Sticker</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {STICKERS.map(s => (
                      <button
                        key={s}
                        onClick={() => setGiftInputSticker(s)}
                        className={`text-2xl p-2 rounded-lg transition-all ${giftInputSticker === s ? 'bg-yellow-500/30 border border-yellow-500' : 'bg-black/20 border border-transparent hover:bg-white/10'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <label className="text-xs text-gray-400 block mb-2">Lời nhắn</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={giftInputMsg}
                      onChange={(e) => setGiftInputMsg(e.target.value)}
                      placeholder="Ví dụ: Chúc bạn luôn xinh đẹp!"
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                      maxLength={40}
                    />
                    <button
                      onClick={addGift}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* List Area */}
                <div className="space-y-2">
                  {giftList.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-4">Chưa có hộp quà nào.</p>
                  ) : (
                    giftList.map((gift, idx) => (
                      <div key={gift.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{gift.sticker}</span>
                          <div>
                            <p className="text-xs text-red-300 font-bold">Hộp quà {idx + 1}</p>
                            <p className="text-sm text-gray-200">{gift.message}</p>
                          </div>
                        </div>
                        <button onClick={() => removeGift(gift.id)} className="text-gray-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-center">
                <button
                  onClick={() => setShowGiftBuilder(false)}
                  className="bg-white/10 hover:bg-white/20 text-white py-2 px-6 rounded-lg font-semibold w-full"
                >
                  Hoàn tất ({giftList.length} quà)
                </button>
              </div>
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
                <p className="text-gray-300 text-sm mb-4">
                  Quét để xem thiệp dành cho <span className="text-white font-bold">{recipientName}</span>
                  <br />
                  <span className="text-xs text-red-300">({giftList.length} hộp quà bí mật)</span>
                </p>

                <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getShareUrl())}`}
                    alt="QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded mb-4">
                  <p className="text-xs text-yellow-200">
                    Lưu ý: Mã QR này dẫn đến trang web chính thức ({PROD_DOMAIN}).
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2.5 px-4 rounded-lg transition-all"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <LinkIcon className="w-5 h-5" />}
                    {copied ? "Đã sao chép liên kết!" : "Sao chép liên kết"}
                  </button>

                  <button
                    onClick={handleDownloadQR}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/40 text-yellow-300 font-semibold py-2.5 px-4 rounded-lg transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Tải ảnh QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
