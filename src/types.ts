
export enum AppMode {
  TREE = 'TREE',
  SPHERE = 'SPHERE',
}

export interface VisionResult {
  gesture: string;
  isPresent: boolean;
}

export interface Gift {
  id: string;
  message: string;
  sticker: string;
}

export const STICKERS = ["🎅", "🎄", "🦌", "⛄", "🎁", "❄️", "🔔", "🧸", "💖", "🌟"];
