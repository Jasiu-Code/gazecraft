import React, { useRef, useState, useEffect } from 'react';
import { BlockType, Inventory, GameMode, BLOCK_COLORS, GameSettings } from '../types';
import { Pickaxe, Hammer, Footprints, XCircle, LogOut } from 'lucide-react';

interface GazeButtonProps {
    onClick: () => void;
    dwellTime: number;
    mousePos: { x: number, y: number };
    className?: string;
    children: React.ReactNode;
    isActive?: boolean;
    disabled?: boolean;
}

export const GazeButton: React.FC<GazeButtonProps> = ({ onClick, dwellTime, mousePos, className, children, isActive, disabled }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const startHoverRef = useRef<number | null>(null);

    useEffect(() => {
        if (disabled) {
            setProgress(0);
            startHoverRef.current = null;
            return;
        }

        const checkHover = () => {
             if (!ref.current) return;
             const rect = ref.current.getBoundingClientRect();
             const isOver = mousePos.x >= rect.left && mousePos.x <= rect.right &&
                            mousePos.y >= rect.top && mousePos.y <= rect.bottom;
            
             if (isOver) {
                 if (startHoverRef.current === null) startHoverRef.current = performance.now();
                 const elapsed = performance.now() - startHoverRef.current;
                 const p = Math.min(elapsed / dwellTime, 1);
                 setProgress(p);

                 if (p >= 1) {
                     onClick();
                     startHoverRef.current = null; // Reset immediately to prevent double clicks until re-entry
                     // Optional: Add a cooldown or require mouse exit could be added here
                     setProgress(0); 
                 }
             } else {
                 startHoverRef.current = null;
                 setProgress(0);
             }
        };
        const frame = requestAnimationFrame(checkHover);
        return () => cancelAnimationFrame(frame);
    }, [mousePos, dwellTime, onClick, disabled]);

    return (
        <div 
            ref={ref} 
            className={`
                relative overflow-hidden cursor-none select-none
                ${className} 
                ${disabled ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95'}
                transition-all duration-200
                ${isActive ? 'ring-4 ring-white shadow-[0_0_30px_rgba(255,255,255,0.5)] scale-110 z-20' : ''}
            `}
        >
             {/* Progress Fill Layer */}
             <div 
                className="absolute left-0 bottom-0 top-0 bg-white/40 transition-all duration-75 ease-linear z-0" 
                style={{ width: `${progress * 100}%` }} 
             />
             
             {/* Content Layer */}
             <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                {children}
             </div>
        </div>
    );
};

// --- Third Person HUD ---

interface HUDProps {
    inventory: Inventory;
    selectedBlock: BlockType;
    onSelect: (b: BlockType) => void;
    gameMode: GameMode;
    onToggleMode: () => void;
    isWalking: boolean;
    onSetWalking: (walking: boolean) => void;
    settings: GameSettings;
    mousePos: { x: number, y: number };
    onExit: () => void;
}

export const HUD: React.FC<HUDProps> = ({ 
    inventory, selectedBlock, onSelect, 
    gameMode, onToggleMode, 
    isWalking, onSetWalking, 
    settings, mousePos, onExit
}) => {
    // Ensure we always have some basic blocks to show if inventory is empty
    const items = Object.entries(inventory)
        .filter(([_, count]) => count > 0)
        .map(([type]) => type as BlockType);
    
    // Fill hotbar with basics if empty (creative mode feel)
    const displayItems: BlockType[] = items.length > 0 
        ? items 
        : ['GRASS', 'DIRT', 'STONE', 'WOOD', 'PLANK', 'GLASS'];

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const zoneW = screenW * 0.15; // 15% width for turn zones

    // Walk Zone Logic
    const walkZoneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkWalkZone = () => {
            if (!walkZoneRef.current) return;
            const rect = walkZoneRef.current.getBoundingClientRect();
            const isOver = mousePos.x >= rect.left && mousePos.x <= rect.right &&
                           mousePos.y >= rect.top && mousePos.y <= rect.bottom;
            
            if (isOver !== isWalking) {
                onSetWalking(isOver);
            }
        };
        const frame = requestAnimationFrame(checkWalkZone);
        return () => cancelAnimationFrame(frame);
    }, [mousePos, isWalking, onSetWalking]);

    return (
        <div className="absolute inset-0 pointer-events-none">
            
            {/* 1. Turn Zones (Restricted Height to avoid corners) */}
            <div 
                className={`absolute left-0 top-1/4 bottom-1/4 bg-gradient-to-r from-black/50 to-transparent transition-opacity duration-300 flex items-center justify-start pl-4 ${mousePos.x < zoneW ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: zoneW }}
            >
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                    <div className="text-white font-black text-4xl">←</div>
                </div>
            </div>
            
            <div 
                className={`absolute right-0 top-1/4 bottom-1/4 bg-gradient-to-l from-black/50 to-transparent transition-opacity duration-300 flex items-center justify-end pr-4 ${mousePos.x > screenW - zoneW ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: zoneW }}
            >
                 <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                    <div className="text-white font-black text-4xl">→</div>
                </div>
            </div>

            {/* 2. Top Walk Zone */}
            <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-auto">
                 <div 
                    ref={walkZoneRef}
                    className={`
                        w-[40%] h-[12vh] rounded-b-[40px] transition-all duration-300 flex items-center justify-center gap-4
                        border-b-4 border-x-4
                        ${isWalking 
                            ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_50px_rgba(16,185,129,0.5)] translate-y-0' 
                            : 'bg-slate-900/80 border-slate-600 -translate-y-2 hover:translate-y-0'}
                    `}
                >
                    <Footprints size={48} className={isWalking ? 'text-white animate-pulse' : 'text-slate-400'} />
                    <span className={`text-3xl font-black uppercase tracking-widest ${isWalking ? 'text-white' : 'text-slate-500'}`}>
                        {isWalking ? 'WALKING' : 'LOOK TO WALK'}
                    </span>
                </div>
            </div>

            {/* 3. Bottom Dashboard (Unified Controls) */}
            <div className="absolute bottom-8 left-0 w-full flex items-end justify-center gap-6 px-8 pointer-events-auto">
                
                {/* Mode Toggle (Large Card) */}
                <GazeButton 
                    onClick={onToggleMode} 
                    dwellTime={settings.dwellTime * 0.8} 
                    mousePos={mousePos}
                    className={`
                        w-48 h-32 rounded-3xl flex flex-col items-center justify-center gap-2 border-4 shadow-2xl
                        ${gameMode === GameMode.MINE 
                            ? 'bg-red-600 border-red-400 shadow-red-900/50' 
                            : 'bg-blue-600 border-blue-400 shadow-blue-900/50'}
                    `}
                >
                    {gameMode === GameMode.MINE ? (
                        <>
                            <Pickaxe size={48} className="text-white" />
                            <span className="text-2xl font-black text-white uppercase tracking-wider">MINE</span>
                            <span className="text-xs text-red-200 font-bold uppercase">Destroy Blocks</span>
                        </>
                    ) : (
                        <>
                            <Hammer size={48} className="text-white" />
                            <span className="text-2xl font-black text-white uppercase tracking-wider">BUILD</span>
                            <span className="text-xs text-blue-200 font-bold uppercase">Place Blocks</span>
                        </>
                    )}
                </GazeButton>

                {/* Inventory Hotbar */}
                <div className="flex-1 max-w-4xl h-32 bg-slate-900/90 backdrop-blur-xl rounded-3xl border-4 border-slate-700 p-3 flex items-center gap-3 overflow-hidden shadow-2xl relative">
                    
                    {/* Label */}
                    <div className="absolute -top-4 left-6 bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Inventory
                    </div>

                    <div className="flex items-center gap-3 w-full overflow-x-auto no-scrollbar justify-center">
                        {displayItems.map((type) => (
                            <GazeButton
                                key={type}
                                dwellTime={settings.dwellTime * 0.6}
                                mousePos={mousePos}
                                onClick={() => onSelect(type)}
                                isActive={selectedBlock === type}
                                className={`
                                    min-w-[80px] h-[80px] rounded-2xl border-2 transition-all flex-shrink-0
                                    ${selectedBlock === type 
                                        ? 'bg-white/20 border-white' 
                                        : 'bg-slate-800 border-slate-600 opacity-70'}
                                `}
                            >
                                <div 
                                    className="w-12 h-12 rounded-lg shadow-inner mb-1" 
                                    style={{ backgroundColor: BLOCK_COLORS[type] }} 
                                />
                                <span className="text-[10px] font-bold text-white uppercase truncate w-full text-center px-1">
                                    {type.replace('_', ' ')}
                                </span>
                            </GazeButton>
                        ))}
                    </div>
                </div>

                {/* Exit Button */}
                <GazeButton 
                    onClick={onExit} 
                    dwellTime={settings.dwellTime} 
                    mousePos={mousePos}
                    className="w-32 h-32 rounded-3xl bg-slate-800 border-4 border-slate-600 hover:bg-red-900/80 hover:border-red-500 shadow-2xl flex flex-col gap-2"
                >
                    <LogOut size={40} className="text-slate-300" />
                    <span className="text-lg font-bold text-slate-300">EXIT</span>
                </GazeButton>

            </div>
        </div>
    );
};
