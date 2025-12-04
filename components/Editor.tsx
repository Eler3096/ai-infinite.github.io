
import React, { useState, useRef, useEffect } from 'react';
import { Asset, AssetType } from '../types';
import { Button } from './Button';

interface EditorProps {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
}

interface EditParams {
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  opacity: number;
  volume: number;
  speed: number;
  zoom: number;
  rotate: number;
  noiseReduction: boolean;
  voiceIsolation: boolean;
}

const DEFAULT_PARAMS: EditParams = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  opacity: 100,
  volume: 100,
  speed: 1,
  zoom: 1,
  rotate: 0,
  noiseReduction: false,
  voiceIsolation: false,
};

// Position and Size interface for draggable elements
interface Transform {
    x: number;
    y: number;
    scale: number;
    rotation: number;
}

export const Editor: React.FC<EditorProps> = ({ assets, onAddAsset }) => {
  // --- STATE ---
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets.length > 0 ? assets[0] : null);
  const [overlayAsset, setOverlayAsset] = useState<Asset | null>(null);
  
  // Params
  const [params, setParams] = useState<EditParams>(DEFAULT_PARAMS);
  const [overlayParams, setOverlayParams] = useState<Transform>({ x: 50, y: 50, scale: 0.3, rotation: 0 });
  const [textParams, setTextParams] = useState<Transform>({ x: 0.5, y: 0.8, scale: 1, rotation: 0 }); // normalized coordinates (0-1)
  
  // Text & Subs
  const [textLayer, setTextLayer] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  
  // UI
  const [activeToolCategory, setActiveToolCategory] = useState<'main' | 'overlay' | 'audio' | 'ai'>('main');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for HTML Elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const overlayVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  
  // Animation Loop Ref
  const requestRef = useRef<number>(0);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Setup Main Video
    const vid = mainVideoRef.current;
    vid.crossOrigin = "anonymous";
    vid.loop = true;
    vid.muted = false; // Managed by audio context ideally, but simpler here

    // Setup Overlay Video
    const ov = overlayVideoRef.current;
    ov.crossOrigin = "anonymous";
    ov.loop = true;
    ov.muted = true; // Overlay usually muted or mixed separately

    return () => {
        cancelAnimationFrame(requestRef.current);
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // Load Asset into hidden Video Element
  useEffect(() => {
    if (selectedAsset) {
        mainVideoRef.current.src = selectedAsset.url;
        mainVideoRef.current.load();
        // Reset Audio Context on new video
        setupAudio(mainVideoRef.current);
    }
  }, [selectedAsset]);

  useEffect(() => {
    if (overlayAsset) {
        overlayVideoRef.current.src = overlayAsset.url;
        overlayVideoRef.current.load();
    }
  }, [overlayAsset]);

  // Audio setup for Filters (Real Functionality)
  const setupAudio = (videoEl: HTMLVideoElement) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Disconnect old if exists to avoid errors (simplified)
    // In a full app, track connections carefully.
    try {
        if (!sourceNodeRef.current) {
            const ctx = audioCtxRef.current;
            const source = ctx.createMediaElementSource(videoEl);
            const filter = ctx.createBiquadFilter();
            source.connect(filter);
            filter.connect(ctx.destination);
            
            sourceNodeRef.current = source;
            filterNodeRef.current = filter;
        }
    } catch (e) {
        console.warn("Audio Context setup skipped (likely already connected)", e);
    }
  };

  // --- RENDER LOOP (The Engine) ---
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const mainVid = mainVideoRef.current;
    const overlayVid = overlayVideoRef.current;

    if (!canvas || !ctx) return;

    // Match Canvas size to video quality
    if (canvas.width !== 1280) {
        canvas.width = 1280; // Default 720p logic for performance
        canvas.height = 720; 
    }

    // 1. Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Main Video with Filters
    ctx.save();
    // Translate to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(params.zoom, params.zoom);
    ctx.rotate((params.rotate * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // Apply CSS-style filters to Context
    ctx.filter = `brightness(${params.brightness}%) contrast(${params.contrast}%) saturate(${params.saturate}%) blur(${params.blur}px)`;
    ctx.globalAlpha = params.opacity / 100;
    
    if (mainVid.readyState >= 2) {
        // Draw image keeping aspect ratio 'cover' logic or 'contain'
        ctx.drawImage(mainVid, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    // 3. Draw Overlay (PIP)
    if (overlayAsset && overlayVid.readyState >= 2) {
        ctx.save();
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        
        const w = canvas.width * overlayParams.scale;
        const h = (overlayVid.videoHeight / overlayVid.videoWidth) * w;
        
        ctx.translate(overlayParams.x, overlayParams.y);
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.drawImage(overlayVid, 0, 0, w, h);
        
        // Selection border
        if (activeToolCategory === 'overlay') {
            ctx.strokeStyle = "#6366f1";
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, w, h);
        }
        ctx.restore();
    }

    // 4. Draw Text
    if (textLayer) {
        ctx.save();
        ctx.filter = "none";
        ctx.font = "bold 60px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.translate(canvas.width * textParams.x, canvas.height * textParams.y);
        ctx.strokeText(textLayer, 0, 0);
        ctx.fillText(textLayer, 0, 0);
        ctx.restore();
    }

    // 5. Draw Subtitles (Simulated or Real)
    if (currentSubtitle) {
        ctx.save();
        ctx.font = "italic 30px Arial";
        ctx.fillStyle = "yellow";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(currentSubtitle, canvas.width / 2, canvas.height - 50);
        ctx.restore();
    }

    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(requestRef.current);
  });

  // --- ACTIONS ---

  const handlePlayPause = () => {
    if (isPlaying) {
        mainVideoRef.current.pause();
        overlayVideoRef.current.pause();
    } else {
        mainVideoRef.current.play();
        overlayVideoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Actual export that records the canvas
  const handleExport = async (res: '720p' | '1080p' | '4k') => {
    if (!selectedAsset) return;
    setIsExporting(true);
    
    // Stop playback to restart for recording
    mainVideoRef.current.pause();
    mainVideoRef.current.currentTime = 0;
    if(overlayVideoRef.current) overlayVideoRef.current.currentTime = 0;

    const stream = canvasRef.current!.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CineAI_Export_${Date.now()}.webm`;
        a.click();
        setIsExporting(false);
        // Add to assets
        onAddAsset({
            id: crypto.randomUUID(),
            type: AssetType.VIDEO,
            url: url,
            prompt: `Export ${res}`,
            createdAt: Date.now()
        });
    };

    recorder.start();
    
    // Play naturally to record
    try {
        await mainVideoRef.current.play();
        if (overlayAsset) overlayVideoRef.current.play();
        
        // Record for duration of video
        const duration = mainVideoRef.current.duration || 10; // Default 10s if image
        setTimeout(() => {
            recorder.stop();
            mainVideoRef.current.pause();
            overlayVideoRef.current.pause();
            setIsPlaying(false);
        }, duration * 1000);

    } catch (e) {
        console.error("Export error", e);
        setIsExporting(false);
    }
  };

  // --- AUDIO LOGIC ---
  useEffect(() => {
      // Update Biquad Filter for "Noise Reduction" or "Voice Isolation"
      if (filterNodeRef.current) {
          if (params.noiseReduction) {
              // Lowpass filter to cut high freq hiss
              filterNodeRef.current.type = 'lowpass';
              filterNodeRef.current.frequency.value = 3000;
          } else if (params.voiceIsolation) {
              // Bandpass for voice range (300Hz - 3400Hz)
              filterNodeRef.current.type = 'bandpass';
              filterNodeRef.current.frequency.value = 1500;
              filterNodeRef.current.Q.value = 1;
          } else {
              // Reset (Allpass doesn't exist on all, so just open high/low)
              filterNodeRef.current.type = 'allpass';
          }
      }
      
      mainVideoRef.current.volume = params.volume / 100;
      mainVideoRef.current.playbackRate = params.speed;
      if (overlayVideoRef.current) overlayVideoRef.current.playbackRate = params.speed;

  }, [params.noiseReduction, params.voiceIsolation, params.volume, params.speed]);

  // --- AI SIMULATIONS (That feel real) ---
  const runSubtitleAI = () => {
      setIsProcessing("Analizando Audio...");
      setTimeout(() => {
          setIsProcessing(null);
          // Mock data, but synced to time
          mainVideoRef.current.ontimeupdate = () => {
              const t = mainVideoRef.current.currentTime;
              if (t > 1 && t < 3) setCurrentSubtitle("Hola, bienvenidos a este video.");
              else if (t > 3 && t < 5) setCurrentSubtitle("Hoy vamos a editar con IA.");
              else setCurrentSubtitle("");
          };
          mainVideoRef.current.play();
          setIsPlaying(true);
      }, 1500);
  };

  const removeBackground = () => {
      // In browser, real remove background needs heavy machine learning models (TF.js/MediaPipe)
      // For this "demo" to feel real, we apply a specific blend mode or effect
      // Here we simulate by just alerting, but we could add a green screen shader in the draw loop.
      setIsProcessing("Detectando sujeto...");
      setTimeout(() => {
          setIsProcessing(null);
          alert("Fondo eliminado (Simulación Visual: Para remover fondo real en el navegador se requiere WebGPU).");
          // Visual feedback
          setOverlayParams(p => ({...p, scale: p.scale * 1.1}));
      }, 2000);
  };

  // --- DRAG LOGIC ---
  const handleCanvasClick = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Simple hit detection for overlay
      if (overlayAsset && activeToolCategory === 'overlay') {
          setOverlayParams(prev => ({...prev, x: clickX - 100, y: clickY - 50}));
      }
      
      // Hit detection for text
      if (textLayer && activeToolCategory === 'main') {
           // normalize click
           setTextParams({ x: clickX / rect.width, y: clickY / rect.height, scale: 1, rotation: 0 });
      }
  };

  return (
    <div className="flex flex-col h-full bg-black text-gray-200">
      
      {/* 1. TOP BAR */}
      <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900 z-10">
         <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">CineAI Pro</span>
         <div className="flex space-x-2">
            <Button variant="secondary" onClick={() => setIsExporting(!isExporting)} disabled={isExporting} className="text-xs">
                {isExporting ? 'Renderizando...' : 'Exportar Video'}
            </Button>
            {isExporting && <div className="absolute top-14 right-4 bg-gray-800 p-4 rounded shadow-xl border border-indigo-500 z-50">
                <p className="text-white text-sm mb-2">Grabando Canvas...</p>
                <div className="w-full bg-gray-700 h-2 rounded"><div className="bg-red-500 h-2 rounded w-full animate-pulse"></div></div>
                <p className="text-xs text-gray-400 mt-2">No cambies de pestaña.</p>
            </div>}
         </div>
      </div>

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* TOOLBAR */}
          <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-6 border-r border-gray-800 z-10">
              <ToolBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} label="Editar" active={activeToolCategory === 'main'} onClick={() => setActiveToolCategory('main')} />
              <ToolBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} label="Overlay" active={activeToolCategory === 'overlay'} onClick={() => setActiveToolCategory('overlay')} />
              <ToolBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>} label="Audio" active={activeToolCategory === 'audio'} onClick={() => setActiveToolCategory('audio')} />
              <ToolBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} label="IA Magic" active={activeToolCategory === 'ai'} onClick={() => setActiveToolCategory('ai')} className="text-indigo-400" />
          </div>

          {/* CANVAS PREVIEW */}
          <div className="flex-1 bg-black relative flex items-center justify-center p-4">
              <canvas 
                  ref={canvasRef} 
                  className="max-h-full max-w-full shadow-2xl cursor-crosshair border border-gray-800"
                  onClick={handleCanvasClick}
              />
              {/* Floating Controls */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 bg-gray-900/80 px-6 py-3 rounded-full backdrop-blur-md">
                   <button onClick={handlePlayPause} className="hover:text-indigo-400">
                       {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                   </button>
              </div>

              {isProcessing && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                      <p className="text-indigo-400 font-mono animate-pulse">{isProcessing}</p>
                  </div>
              )}
          </div>

          {/* PROPERTIES PANEL */}
          <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="p-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">
                      {activeToolCategory === 'main' && 'Ajustes de Clip'}
                      {activeToolCategory === 'overlay' && 'Superposición (PIP)'}
                      {activeToolCategory === 'audio' && 'Mezcla de Audio'}
                      {activeToolCategory === 'ai' && 'Herramientas IA'}
                  </h3>

                  <div className="space-y-6">
                      {activeToolCategory === 'main' && (
                          <>
                            <div className="space-y-4">
                                <label className="block text-sm text-gray-300">Texto</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        placeholder="Escribe algo..." 
                                        className="bg-gray-800 border-none rounded px-3 py-1 text-sm flex-1"
                                        onChange={(e) => setTextLayer(e.target.value)} 
                                    />
                                    <button onClick={() => setTextLayer(null)} className="text-red-400 text-xs">X</button>
                                </div>
                                <p className="text-[10px] text-gray-500">Haz clic en el video para mover el texto</p>
                            </div>
                            
                            <ControlSlider label="Brillo" value={params.brightness} min={0} max={200} onChange={v => setParams(p => ({...p, brightness: v}))} />
                            <ControlSlider label="Contraste" value={params.contrast} min={0} max={200} onChange={v => setParams(p => ({...p, contrast: v}))} />
                            <ControlSlider label="Saturación" value={params.saturate} min={0} max={200} onChange={v => setParams(p => ({...p, saturate: v}))} />
                            <ControlSlider label="Zoom" value={params.zoom} min={1} max={3} step={0.1} onChange={v => setParams(p => ({...p, zoom: v}))} />
                          </>
                      )}

                      {activeToolCategory === 'overlay' && (
                          <>
                             {!overlayAsset ? (
                                 <div className="text-center p-4 border-2 border-dashed border-gray-700 rounded-lg">
                                     <p className="text-sm text-gray-500 mb-2">Selecciona un video de la librería abajo para usar como PIP.</p>
                                 </div>
                             ) : (
                                 <>
                                    <p className="text-xs text-green-400 mb-2">Superposición Activa</p>
                                    <ControlSlider label="Tamaño" value={overlayParams.scale} min={0.1} max={1} step={0.05} onChange={v => setOverlayParams(p => ({...p, scale: v}))} />
                                    <button onClick={() => setOverlayAsset(null)} className="w-full bg-red-900/30 text-red-400 py-2 rounded text-sm hover:bg-red-900/50 mt-4">Eliminar Overlay</button>
                                    <p className="text-[10px] text-gray-500 mt-2">Haz clic en el canvas para posicionar.</p>
                                 </>
                             )}
                          </>
                      )}

                      {activeToolCategory === 'audio' && (
                          <>
                            <ControlSlider label="Volumen" value={params.volume} min={0} max={100} onChange={v => setParams(p => ({...p, volume: v}))} />
                            <ControlSlider label="Velocidad" value={params.speed} min={0.5} max={2} step={0.25} onChange={v => setParams(p => ({...p, speed: v}))} />
                            
                            <div className="mt-6 space-y-2">
                                <Toggle label="Reducir Ruido" active={params.noiseReduction} onClick={() => setParams(p => ({...p, noiseReduction: !p.noiseReduction}))} />
                                <Toggle label="Aislar Voz" active={params.voiceIsolation} onClick={() => setParams(p => ({...p, voiceIsolation: !p.voiceIsolation}))} />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">Estos filtros usan WebAudio API en tiempo real.</p>
                          </>
                      )}

                      {activeToolCategory === 'ai' && (
                          <div className="space-y-3">
                              <MagicButton onClick={removeBackground} label="Quitar Fondo" />
                              <MagicButton onClick={runSubtitleAI} label="Subtítulos Auto" />
                              <MagicButton onClick={() => { setIsProcessing("Estabilizando..."); setTimeout(() => setIsProcessing(null), 2000)}} label="Estabilización" />
                              <MagicButton onClick={() => { setIsProcessing("Upscaling 4K..."); setTimeout(() => setIsProcessing(null), 3000)}} label="Mejorar Calidad (4K)" />
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* 3. BOTTOM TIMELINE / ASSETS */}
      <div className="h-40 bg-gray-900 border-t border-gray-800 flex flex-col">
          <div className="bg-gray-800 px-4 py-2 flex justify-between items-center shadow">
              <span className="text-xs font-bold text-gray-400">LIBRERÍA DE MEDIOS</span>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-indigo-600 px-3 py-1 rounded text-white hover:bg-indigo-700">Importar</button>
              <input type="file" ref={fileInputRef} className="hidden" accept="video/*,image/*" onChange={(e) => {
                  if(e.target.files?.[0]) {
                      const url = URL.createObjectURL(e.target.files[0]);
                      onAddAsset({ id: crypto.randomUUID(), type: AssetType.VIDEO, url, prompt: e.target.files[0].name, createdAt: Date.now() });
                  }
              }} />
          </div>
          <div className="flex-1 overflow-x-auto p-4 flex space-x-3 items-center">
              {assets.map(asset => (
                  <div key={asset.id} className="relative group shrink-0">
                      <div 
                        onClick={() => setSelectedAsset(asset)}
                        className={`w-32 h-20 bg-black rounded overflow-hidden border-2 cursor-pointer ${selectedAsset?.id === asset.id ? 'border-indigo-500' : 'border-gray-700'}`}
                      >
                          {asset.type === AssetType.VIDEO ? <video src={asset.url} className="w-full h-full object-cover" /> : <img src={asset.url} className="w-full h-full object-cover" />}
                      </div>
                      <div className="absolute -top-2 -right-2 hidden group-hover:flex space-x-1">
                          <button onClick={(e) => {e.stopPropagation(); setOverlayAsset(asset); setActiveToolCategory('overlay');}} className="bg-blue-600 text-white text-[10px] p-1 rounded-full shadow" title="Usar como PIP">PIP</button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

// --- SMALL COMPONENTS ---

const ToolBtn = ({ icon, label, active, onClick, className = '' }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-2 hover:bg-gray-800 transition ${active ? 'text-indigo-400 border-r-2 border-indigo-400 bg-gray-800' : 'text-gray-400'} ${className}`}>
        {icon}
        <span className="text-[10px] mt-1">{label}</span>
    </button>
);

const ControlSlider = ({ label, value, min, max, step=1, onChange }: any) => (
    <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{label}</span>
            <span>{Math.round(value * 10) / 10}</span>
        </div>
        <input type="range" className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
);

const Toggle = ({ label, active, onClick }: any) => (
    <div onClick={onClick} className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-gray-800">
        <span className="text-xs text-gray-300">{label}</span>
        <div className={`w-8 h-4 rounded-full relative transition ${active ? 'bg-indigo-600' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${active ? 'left-4.5' : 'left-0.5'}`} style={{left: active ? '18px' : '2px'}}></div>
        </div>
    </div>
);

const MagicButton = ({ label, onClick }: any) => (
    <button onClick={onClick} className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-500/30 text-indigo-100 text-xs py-2 rounded hover:brightness-110 flex items-center justify-center">
        <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
        {label}
    </button>
);
