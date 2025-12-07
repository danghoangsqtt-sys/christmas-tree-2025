
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export class VisionService {
  private static instance: VisionService;
  private handLandmarker: HandLandmarker | null = null;
  private runningMode: "IMAGE" | "VIDEO" = "VIDEO";
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;

  private constructor() {}

  public static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  public async initialize() {
    if (this.handLandmarker) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: this.runningMode,
        numHands: 1
      });
      console.log("MediaPipe HandLandmarker loaded");
    } catch (e) {
      console.error("Error initializing MediaPipe:", e);
      throw e;
    }
  }

  public start(videoElement: HTMLVideoElement) {
    this.video = videoElement;
  }

  public detect(): { gesture: string; isPresent: boolean } {
    // Ensure HandLandmarker is loaded and video element exists
    if (!this.handLandmarker || !this.video) return { gesture: 'None', isPresent: false };

    // CRITICAL: Ensure video has valid dimensions before processing to avoid MediaPipe crash
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      return { gesture: 'None', isPresent: false };
    }

    let startTimeMs = performance.now();
    
    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      
      const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
      
      if (results.landmarks && results.landmarks.length > 0) {
        // Simple gesture logic
        const landmarks = results.landmarks[0];
        const wrist = landmarks[0];

        // A simple "Is Fist" check
        // We compare the distance of fingertips to wrist vs PIP joints (knuckles) to wrist.
        const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
        const pips = [6, 10, 14, 18]; // Corresponding PIP joints
        
        let curledCount = 0;
        
        for(let i=0; i<4; i++) {
           // If tip is closer to wrist than the PIP joint, it is curled.
           const dTip = Math.hypot(landmarks[tips[i]].x - wrist.x, landmarks[tips[i]].y - wrist.y);
           const dPip = Math.hypot(landmarks[pips[i]].x - wrist.x, landmarks[pips[i]].y - wrist.y);
           
           // Allow slight margin
           if (dTip < dPip * 1.2) { 
             curledCount++;
           }
        }
        
        // If 3 or more fingers are curled, consider it a Fist
        if (curledCount >= 3) {
          return { gesture: 'Closed_Fist', isPresent: true };
        } else {
          return { gesture: 'Open_Palm', isPresent: true };
        }
      }
    }
    return { gesture: 'None', isPresent: false };
  }
}
