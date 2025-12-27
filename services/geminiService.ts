import { Chunk3D, BlockData } from "../types";

// Removed GoogleGenAI dependency to prevent "Missing API Key" errors in browser.
// Using deterministic generation only.

interface GeneratedCell {
  type: string;
  height: number;
  feature: 'NONE' | 'TREE' | 'ROCK' | 'FLOWER' | 'STRUCTURE' | 'POND';
}

interface GeneratedHeightMap {
  biomeName: string;
  description: string;
  grid: GeneratedCell[];
}

export const generateChunkData = async (chunkX: number, chunkZ: number): Promise<Chunk3D> => {
  const size = 32;

  // IMMEDIATE FALLBACK - Skipping AI for performance
  const blocks: BlockData[] = [];

  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const globalX = x + (chunkX * size);
      const globalZ = z + (chunkZ * size);

      // Bedrock at 0
      blocks.push({
        id: `fb-bedrock-${globalX}-${globalZ}`,
        type: 'BEDROCK',
        x: globalX,
        y: 0,
        z: globalZ
      });

      // Grass at 1
      blocks.push({
        id: `fb-grass-${globalX}-${globalZ}`,
        type: 'GRASS',
        x: globalX,
        y: 1,
        z: globalZ
      });
    }
  }

  return Promise.resolve({
    id: `${chunkX},${chunkZ}`,
    biomeName: "Fast Plains",
    description: "Optimized for speed.",
    blocks,
    size
  });
};
