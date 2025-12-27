import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Chunk3D, GameMode, BlockData, BLOCK_COLORS, PlayerState, BlockType, Inventory } from '../types';

interface GameSceneProps {
    chunk: Chunk3D | null;
    mode: GameMode;
    selectedBlockType: BlockType;
    inventory: Inventory;
    onInventoryChange: (inv: Inventory) => void;
    mousePos: { x: number; y: number };
    isPlaying: boolean;
    dwellTime: number;
    playerState: PlayerState;
    setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
    onHoverChange: (isHovering: boolean, progress: number) => void;
}

// Improved Voxel Texture Generator with Detail
const createBlockTexture = () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // 1. Base White (Canvas standard)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 2. Pixelated Noise (Larger pixels for a chunkier feel)
    const pxSize = 8;
    for (let x = 0; x < size; x += pxSize) {
        for (let y = 0; y < size; y += pxSize) {
            // Very subtle variation to not overpower the base color
            const brightness = 0.92 + (Math.random() * 0.08);
            const c = Math.floor(255 * brightness);
            ctx.fillStyle = `rgb(${c},${c},${c})`;
            ctx.fillRect(x, y, pxSize, pxSize);
        }
    }

    // 3. Bevel - Dark bottom/right
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, size - 4, size, 4); // Bottom
    ctx.fillRect(size - 4, 0, 4, size); // Right

    // 4. Bevel - Light top/left
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, 0, size, 4); // Top
    ctx.fillRect(0, 0, 4, size); // Left

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

// Floor Texture - Grassy Green Field
const createFloorTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Base Green
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, 512, 512);

    // Grid Lines (Subtle)
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 512; i += 64) {
        ctx.moveTo(i, 0); ctx.lineTo(i, 512);
        ctx.moveTo(0, i); ctx.lineTo(512, i);
    }
    ctx.stroke();

    // Noise
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#15803d' : '#064e3b';
        const s = Math.random() * 4 + 2;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

export const GameScene: React.FC<GameSceneProps> = ({
    chunk, mode, selectedBlockType, inventory, onInventoryChange,
    mousePos, isPlaying, dwellTime, playerState, setPlayerState,
    onHoverChange
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const blocksMeshRef = useRef<THREE.InstancedMesh | null>(null);

    // Textures
    const blockTextureRef = useRef<THREE.Texture | null>(null);

    // Avatar Refs
    const playerGroupRef = useRef<THREE.Group | null>(null);
    const avatarPartsRef = useRef<{
        leftArm: THREE.Object3D;
        rightArm: THREE.Object3D;
        leftLeg: THREE.Object3D;
        rightLeg: THREE.Object3D;
    } | null>(null);

    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const interactionRef = useRef<{
        targetId: number | null;
        startTime: number | null;
        faceNormal: THREE.Vector3 | null;
    }>({ targetId: null, startTime: null, faceNormal: null });

    const [localBlocks, setLocalBlocks] = useState<BlockData[]>([]);

    // Mutable refs
    const playerStateRef = useRef(playerState);
    const mousePosRef = useRef(mousePos);
    const localBlocksRef = useRef(localBlocks);
    const modeRef = useRef(mode);
    const inventoryRef = useRef(inventory);
    const selectedBlockRef = useRef(selectedBlockType);
    const dwellTimeRef = useRef(dwellTime);

    // Sync refs
    useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
    useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
    useEffect(() => { localBlocksRef.current = localBlocks; }, [localBlocks]);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
    useEffect(() => { selectedBlockRef.current = selectedBlockType; }, [selectedBlockType]);
    useEffect(() => { dwellTimeRef.current = dwellTime; }, [dwellTime]);

    useEffect(() => {
        if (chunk) {
            setLocalBlocks(chunk.blocks);
        }
    }, [chunk]);

    // --- Helper: Create Limb ---
    const createLimb = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(0, -h / 2, 0);
        const mat = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        return mesh;
    };

    // --- Initialization ---
    useEffect(() => {
        console.log("GameScene: Mount");
        if (!containerRef.current) {
            console.error("GameScene: No container ref");
            return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 20, 90);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '10'; // Force top
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        console.log("GameScene: Renderer styled and appended");

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(50, 80, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        const planeGeo = new THREE.PlaneGeometry(1000, 1000);
        const floorTex = createFloorTexture();
        const planeMat = new THREE.MeshStandardMaterial({
            map: floorTex,
            roughness: 1,
            color: 0xffffff
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.01;
        plane.receiveShadow = true;
        scene.add(plane);

        const playerGroup = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.75, 0.3);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        playerGroup.add(body);

        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.35;
        head.castShadow = true;
        playerGroup.add(head);

        const visorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.35, 0.2);
        playerGroup.add(visor);

        const leftArm = createLimb(0.2, 0.7, 0.2, 0x3b82f6, -0.45, 1.1, 0);
        const rightArm = createLimb(0.2, 0.7, 0.2, 0x3b82f6, 0.45, 1.1, 0);
        const leftLeg = createLimb(0.22, 0.7, 0.22, 0x1e3a8a, -0.15, 0.4, 0);
        const rightLeg = createLimb(0.22, 0.7, 0.22, 0x1e3a8a, 0.15, 0.4, 0);

        playerGroup.add(leftArm);
        playerGroup.add(rightArm);
        playerGroup.add(leftLeg);
        playerGroup.add(rightLeg);

        scene.add(playerGroup);
        playerGroupRef.current = playerGroup;
        avatarPartsRef.current = { leftArm, rightArm, leftLeg, rightLeg };

        blockTextureRef.current = createBlockTexture();

        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (renderer.domElement && containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // --- Block Instancing ---
    useEffect(() => {
        if (!sceneRef.current) return;

        if (blocksMeshRef.current) {
            sceneRef.current.remove(blocksMeshRef.current);
            blocksMeshRef.current.dispose();
            blocksMeshRef.current = null;
        }

        if (localBlocks.length === 0) return;

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            map: blockTextureRef.current,
            color: 0xffffff
        });

        const maxCount = localBlocks.length + 1000;
        const mesh = new THREE.InstancedMesh(geometry, material, maxCount);

        mesh.count = localBlocks.length;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        localBlocks.forEach((block, i) => {
            dummy.position.set(block.x, block.y + 0.5, block.z);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            const hex = BLOCK_COLORS[block.type];
            if (hex) {
                color.set(hex);
            } else {
                color.set('#ff00ff');
            }
            mesh.setColorAt(i, color);
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        blocksMeshRef.current = mesh;
        sceneRef.current.add(mesh);
    }, [localBlocks]);

    const getTerrainHeightAt = (x: number, z: number, blocks: BlockData[]) => {
        const rx = Math.round(x);
        const rz = Math.round(z);
        let maxY = -10;

        for (const b of blocks) {
            if (b.x === rx && b.z === rz) {
                if (!['AIR', 'FLOWER', 'WATER'].includes(b.type)) {
                    if (b.y > maxY) maxY = b.y;
                }
            }
        }
        return maxY;
    };

    // --- Game Loop ---
    useEffect(() => {
        if (!isPlaying) return;

        let frameId: number;
        let walkCycle = 0;

        const animate = () => {
            if (!isPlaying) return;

            if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
                // console.warn("GameScene: Waiting for init...");
                frameId = requestAnimationFrame(animate);
                return;
            }
            if (!playerGroupRef.current || !avatarPartsRef.current) {
                // console.warn("GameScene: Waiting for assets...");
                frameId = requestAnimationFrame(animate);
                return;
            }

            // console.log("GameScene: Rendering frame"); // Uncomment for spam logging if needed

            const pState = playerStateRef.current;
            const mPos = mousePosRef.current;
            const blocks = localBlocksRef.current;
            const currentDwell = dwellTimeRef.current;

            // --- IMPROVEMENT: SLOWER SPEEDS ---
            const speed = 0.04; // Reduced from 0.08
            const rotSpeed = 0.008; // Reduced from 0.015

            let nextPos = { ...pState.position };
            let nextRot = pState.rotation;
            let isMoving = pState.isWalking;

            const screenW = window.innerWidth;
            const zoneSize = screenW * 0.2;

            if (mPos.x < zoneSize) {
                const intensity = 1 - (mPos.x / zoneSize);
                nextRot += rotSpeed * (0.5 + intensity * 0.5);
            } else if (mPos.x > screenW - zoneSize) {
                const intensity = (mPos.x - (screenW - zoneSize)) / zoneSize;
                nextRot -= rotSpeed * (0.5 + intensity * 0.5);
            }

            if (isMoving) {
                nextPos.x += Math.sin(nextRot) * speed;
                nextPos.z += Math.cos(nextRot) * speed;
                walkCycle += 0.1; // Reduced from 0.2 for slower limb movement
                const { leftArm, rightArm, leftLeg, rightLeg } = avatarPartsRef.current;
                const limbAmp = 0.6;
                leftLeg.rotation.x = Math.sin(walkCycle) * limbAmp;
                rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * limbAmp;
                leftArm.rotation.x = Math.sin(walkCycle + Math.PI) * limbAmp;
                rightArm.rotation.x = Math.sin(walkCycle) * limbAmp;
            } else {
                walkCycle = 0;
                const { leftArm, rightArm, leftLeg, rightLeg } = avatarPartsRef.current;
                leftLeg.rotation.x *= 0.8;
                rightLeg.rotation.x *= 0.8;
                leftArm.rotation.x *= 0.8;
                rightArm.rotation.x *= 0.8;
            }

            let groundY = -10;
            if (blocks.length > 0) {
                groundY = getTerrainHeightAt(nextPos.x, nextPos.z, blocks);
            }
            if (groundY < 1) groundY = 1;
            const targetY = groundY + 1.0;

            if (nextPos.y < targetY) {
                nextPos.y += 0.2;
                if (nextPos.y > targetY) nextPos.y = targetY;
            } else if (nextPos.y > targetY) {
                nextPos.y -= 0.1;
                if (nextPos.y < targetY) nextPos.y = targetY;
            }

            const bobOffset = isMoving ? Math.abs(Math.sin(walkCycle * 2)) * 0.05 : 0;
            playerGroupRef.current.position.y = nextPos.y + bobOffset;
            playerGroupRef.current.position.x = nextPos.x;
            playerGroupRef.current.position.z = nextPos.z;
            playerGroupRef.current.rotation.y = nextRot;

            if (Math.abs(nextRot - pState.rotation) > 0.001 ||
                Math.abs(nextPos.x - pState.position.x) > 0.001 ||
                Math.abs(nextPos.z - pState.position.z) > 0.001 ||
                Math.abs(nextPos.y - pState.position.y) > 0.001) {
                setPlayerState(prev => ({
                    ...prev,
                    position: { x: nextPos.x, y: nextPos.y, z: nextPos.z },
                    rotation: nextRot
                }));
            }

            const camDist = 5;
            const camHeight = 3.5;
            const idealCamX = nextPos.x - Math.sin(nextRot) * camDist;
            const idealCamZ = nextPos.z - Math.cos(nextRot) * camDist;
            const idealCamY = nextPos.y + camHeight;

            cameraRef.current.position.x += (idealCamX - cameraRef.current.position.x) * 0.1;
            cameraRef.current.position.z += (idealCamZ - cameraRef.current.position.z) * 0.1;
            cameraRef.current.position.y += (idealCamY - cameraRef.current.position.y) * 0.1;

            const targetX = nextPos.x + Math.sin(nextRot) * 2;
            const targetZ = nextPos.z + Math.cos(nextRot) * 2;
            cameraRef.current.lookAt(targetX, nextPos.y + 1, targetZ);

            const ndcX = (mPos.x / window.innerWidth) * 2 - 1;
            const ndcY = -(mPos.y / window.innerHeight) * 2 + 1;
            raycasterRef.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);
            const intersects = blocksMeshRef.current
                ? raycasterRef.current.intersectObject(blocksMeshRef.current)
                : [];

            if (intersects.length > 0) {
                const hit = intersects[0];
                const instanceId = hit.instanceId;
                if (instanceId !== undefined && instanceId < blocks.length) {
                    if (interactionRef.current.targetId !== instanceId) {
                        interactionRef.current.targetId = instanceId;
                        interactionRef.current.startTime = performance.now();
                        interactionRef.current.faceNormal = hit.face?.normal || null;
                    }
                    if (interactionRef.current.startTime) {
                        const elapsed = performance.now() - interactionRef.current.startTime;
                        const progress = Math.min(elapsed / currentDwell, 1);
                        onHoverChange(true, progress);
                        if (progress >= 1) {
                            performAction(instanceId, hit);
                            interactionRef.current.startTime = performance.now();
                            onHoverChange(false, 0);
                        }
                    }
                }
            } else {
                interactionRef.current.targetId = null;
                interactionRef.current.startTime = null;
                onHoverChange(false, 0);
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current);
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying]);

    const performAction = (index: number, hit: THREE.Intersection) => {
        const blocks = localBlocksRef.current;
        const currentInv = inventoryRef.current;
        const currentMode = modeRef.current;
        const selected = selectedBlockRef.current;

        const targetBlock = blocks[index];
        if (!targetBlock) return;

        if (currentMode === GameMode.MINE) {
            if (targetBlock.type === 'BEDROCK') return;
            const newInv = { ...currentInv };
            newInv[targetBlock.type] = (newInv[targetBlock.type] || 0) + 1;
            onInventoryChange(newInv);
            const newBlocks = [...blocks];
            newBlocks.splice(index, 1);
            setLocalBlocks(newBlocks);
        } else if (currentMode === GameMode.BUILD) {
            if (!interactionRef.current.faceNormal) return;
            const normal = interactionRef.current.faceNormal;
            const newX = Math.round(targetBlock.x + normal.x);
            const newY = Math.round(targetBlock.y + normal.y);
            const newZ = Math.round(targetBlock.z + normal.z);
            const newBlock: BlockData = {
                id: `placed-${Date.now()}`,
                type: selected,
                x: newX,
                y: newY,
                z: newZ
            };
            const newInv = { ...currentInv };
            onInventoryChange(newInv);
            setLocalBlocks(prev => [...prev, newBlock]);
        }
    };

    return <div ref={containerRef} className="absolute inset-0 z-0" />;
};
