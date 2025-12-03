export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video'
}

export interface Asset {
  id: string;
  type: AssetType;
  url: string;
  thumbnail?: string;
  prompt: string;
  createdAt: number;
}

export enum ViewMode {
  EDITOR = 'editor',
  GENERATE_VIDEO = 'gen_video',
  GENERATE_IMAGE = 'gen_image'
}

export interface GenerationConfig {
  prompt: string;
  aspectRatio: string;
  resolution?: string; // For Veo
}
