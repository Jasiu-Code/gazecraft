import React, { useState, useEffect } from 'react';
import { Settings, Play } from 'lucide-react';
import { GameMode, GameSettings, BlockType, Inventory, Chunk3D, PlayerState, BlockData } from './types';
import { GazeCursor } from './components/GazeCursor';
import { GameScene } from './components/GameScene';
import { HUD, GazeButton } from './components/UI';
import { generateChunkData } from './services/geminiService';

const INITIAL_SETTINGS: GameSettings = {
    dwellTime: 1000,
    cursorSize: 48,
    highContrast: false,
    moveSpeed: 0.1,
    turnSpeed: 0.03
};

// Larger 32x32 loading chunk
const LOADING_CHUNK: Chunk3D = {
    id: 'loading',
    biomeName: 'Loading...',
    description: 'Generating World...',
    size: 32,
    blocks: (() => {
        const blocks: BlockData[] = [];
        for (let x = 0; x < 32; x++) {
            for (let z = 0; z < 32; z++) {
                blocks.push({ id: `base-${x}-${z}`, type: 'BEDROCK', x, y: 0, z });
                blocks.push({ id: `grass-${x}-${z}`, type: 'GRASS', x, y: 1, z });
            }
        }
        return blocks;
    })()
};

const INITIAL_PLAYER: PlayerState = {
    position: { x: 16, y: 3, z: 16 }, // Center of 32x32
    rotation: 0,
    isWalking: false
};

const App: React.FC = () => {
    // --- State ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
    const [chunkData, setChunkData] = useState<Chunk3D | null>(LOADING_CHUNK);

    // Game State
    const [mode, setMode] = useState<GameMode>(GameMode.MINE);
    const [inventory, setInventory] = useState<Inventory>({ DIRT: 0, WOOD: 5, STONE: 0 });
    const [selectedBlockType, setSelectedBlockType] = useState<BlockType>('WOOD');
    const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_PLAYER);

    // Interaction State
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [cursorProgress, setCursorProgress] = useState(0);
    const [isHoveringBlock, setIsHoveringBlock] = useState(false);

    // --- Map Loading ---
    const loadWorld = async () => {
        try {
            const data = await generateChunkData(0, 0);
            setChunkData(data);
        } catch (e) {
            console.error("Failed to load world, sticking with fallback.");
        }
    };

    useEffect(() => {
        if (isPlaying) {
            loadWorld();
        }
    }, [isPlaying]);

    // --- Input Tracking ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // --- Render ---

    if (!isPlaying) {
        return (
            <div className="h-screen w-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans cursor-none overflow-hidden relative overflow-hidden">

                {/* Background Effect */}
                <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-black" />

                <GazeCursor position={mousePos} isDwelling={false} progress={0} settings={settings} />

                <div className="z-10 text-center">
                    <h1 className="text-8xl font-black tracking-tighter mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-2xl">
                        GazeCraft 3D
                    </h1>
                    <p className="text-2xl text-slate-400 mb-12 font-light">Explore. Build. Survive. With just a look.</p>

                    <div className="flex flex-col items-center gap-6">
                        <GazeButton
                            onClick={() => setIsPlaying(true)}
                            dwellTime={settings.dwellTime}
                            mousePos={mousePos}
                            className="bg-emerald-600 hover:bg-emerald-500 rounded-2xl p-8 flex items-center justify-center gap-4 w-80 shadow-emerald-900/50 shadow-lg"
                        >
                            <Play size={40} />
                            <span className="text-3xl font-bold">Enter World</span>
                        </GazeButton>

                        <div className="flex gap-4 w-80">
                            <GazeButton
                                onClick={() => setSettings(s => ({ ...s, dwellTime: s.dwellTime === 1000 ? 500 : 1000 }))}
                                dwellTime={settings.dwellTime}
                                mousePos={mousePos}
                                className="flex-1 bg-slate-800 rounded-xl p-6 flex flex-col items-center border border-slate-700"
                            >
                                <Settings size={32} className="mb-2 text-slate-300" />
                                <span className="text-sm">Speed: {settings.dwellTime === 1000 ? 'Normal' : 'Fast'}</span>
                            </GazeButton>
                        </div>
                    </div>

                    <div className="mt-12 text-slate-500 text-sm space-y-2">
                        <p>Look at the <span className="text-emerald-400 font-bold">EDGES</span> to turn.</p>
                        <p>Look at the <span className="text-white font-bold">TOP</span> to walk.</p>
                        <p>Look at <span className="text-amber-400 font-bold">BLOCKS</span> to mine or build.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden cursor-none select-none relative bg-red-900">

            {/* The 3D World */}
            <GameScene
                chunk={chunkData}
                mode={mode}
                selectedBlockType={selectedBlockType}
                inventory={inventory}
                onInventoryChange={setInventory}
                mousePos={mousePos}
                isPlaying={isPlaying}
                dwellTime={settings.dwellTime}
                playerState={playerState}
                setPlayerState={setPlayerState}
                onHoverChange={(isHovering, progress) => {
                    setIsHoveringBlock(isHovering);
                    setCursorProgress(progress);
                }}
            />

            {/* HUD Layer */}
            <HUD
                inventory={inventory}
                selectedBlock={selectedBlockType}
                onSelect={setSelectedBlockType}
                gameMode={mode}
                onToggleMode={() => setMode(m => m === GameMode.MINE ? GameMode.BUILD : GameMode.MINE)}
                isWalking={playerState.isWalking}
                onSetWalking={(walking) => setPlayerState(prev => ({ ...prev, isWalking: walking }))}
                settings={settings}
                mousePos={mousePos}
                onExit={() => setIsPlaying(false)}
            />

            {/* Custom Cursor with Progress Feedback */}
            <GazeCursor
                position={mousePos}
                isDwelling={isHoveringBlock || cursorProgress > 0}
                progress={cursorProgress}
                settings={settings}
            />

        </div>
    );
};

export default App;
