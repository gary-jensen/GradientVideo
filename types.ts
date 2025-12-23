
export type GradientType = 'linear' | 'radial' | 'mesh';

export interface GradientSettings {
  type: GradientType;
  colors: string[];
  angle: number;
}

export interface CropRegion {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
}

export interface VideoConfig {
  borderRadius: number;
  padding: number;
  shadow: number;
  scale: number;
  crop: {
    enabled: boolean; // Whether crop is applied
    cropMode: boolean; // Whether we're currently editing the crop
    region: CropRegion;
  };
}

export interface EditorState {
  videoUrl: string | null;
  videoName: string | null;
  gradient: GradientSettings;
  config: VideoConfig;
}
