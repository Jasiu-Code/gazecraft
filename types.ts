
export type Vector3 = { x: number; y: number; z: number };

export type BlockType = 
  | 'AIR' 
  | 'GRASS' 
  | 'DIRT' 
  | 'STONE' 
  | 'WOOD' 
  | 'LEAVES' 
  | 'SAND' 
  | 'WATER' 
  | 'COAL_ORE' 
  | 'DIAMOND_ORE' 
  | 'BEDROCK'
  | 'PLANK'
  | 'BRICK'
  | 'GLASS'
  | 'FLOWER'
  | 'SNOW'
  | 'SANDSTONE';

export interface BlockData {
  id: string; 
  type: BlockType;
  x: number;
  y: number;
  z: number;
}

export interface Chunk3D {
  id: string;
  biomeName: string;
  description: string;
  blocks: BlockData[]; // Flattened list of blocks
  size: number; // width/depth
}

export enum GameMode {
  MINE = 'MINE',
  BUILD = 'BUILD',
}

export interface Inventory {
  [key: string]: number; 
}

export interface GameSettings {
  dwellTime: number; 
  cursorSize: number;
  highContrast: boolean;
  moveSpeed: number;
  turnSpeed: number;
}

export interface PlayerState {
  position: Vector3;
  rotation: number; // Y-axis rotation in radians
  isWalking: boolean;
}

export const BLOCK_COLORS: Record<BlockType, string> = {
  AIR: '#ffffff',
  GRASS: '#4ade80', // Vibrant Light Green
  DIRT: '#a16207', // Lighter Earthy Brown
  STONE: '#cbd5e1', // Very Light Grey
  WOOD: '#78350f', // Lighter Brown
  LEAVES: '#22c55e', // Bright Green
  SAND: '#fde047', // Sunny Yellow
  WATER: '#67e8f9', // Bright Cyan
  COAL_ORE: '#64748b', // Slate
  DIAMOND_ORE: '#67e8f9', // Cyan
  BEDROCK: '#475569', // Slate Grey (Not Black!)
  PLANK: '#f59e0b', // Bright Amber
  BRICK: '#f87171', // Light Red
  GLASS: '#e0f2fe', // Very Pale Blue
  FLOWER: '#f472b6', // Pink
  SNOW: '#ffffff',
  SANDSTONE: '#fcd34d',
};
