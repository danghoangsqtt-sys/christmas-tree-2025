
export enum AppMode {
  TREE = 'TREE',
  SPHERE = 'SPHERE',
}

export interface VisionResult {
  gesture: string;
  isPresent: boolean;
}
