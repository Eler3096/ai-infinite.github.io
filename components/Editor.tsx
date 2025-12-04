
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
  stabilization: boolean;
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
  stabilization: false,
  voiceIsolation: false,
};

type AspectRatio = '16/9' | '9/16' | '1/1' | '4/3' | '21/9';
type ExportQuality = '720p' | '1080p' | '4k';

export const Editor: React.FC<EditorProps> = ({ assets, onAddAsset }) => {
  // --- STATE ---
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets.length > 0 ? assets[0] : null);
  const [overlayAsset, setOverlayAsset] = useState<Asset | null>(null);
  const [params, setParams] = useState<EditParams>(DEFAULT_PARAMS);
  const [canvasAspect, setCanvasAspect] = useState<AspectRatio>('16/9');
  
  // Layers
  const [showTextLayer, setShowTextLayer] = useState(false);
  const [textLayerContent, setTextLayerContent] = useState("Texto Editable");
  const [showSubtitles, setShowSubtitles] = useState(false);
  
  // UI State
  const [activeToolCategory, setActiveToolCategory] = useState<'main' | 'audio' | 'ai' | 'export'>('main');
  const [isProcessingAI, setIsProcessingAI] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Playback State
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- EFFECT: Sync Selection ---
  useEffect(() => {
    if (!selectedAsset && assets.length > 0) setSelectedAsset(assets[0]);
    if (selectedAsset) {
        // Reset specific params but keep others if desired. For now reset all for safety.
        // In a real app we might cache params per asset ID.
    }
  }, [assets, selectedAsset]);

  // --- HELPERS ---
  const updateParam = (key: keyof EditParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
    if (key === 'speed' && videoRef.current) {
        videoRef.current.playbackRate = value;
        if(overlayRef.current) overlayRef.current.playbackRate = value;
    }
    if (key === 'volume' && videoRef.current) {
        videoRef.current.volume = value / 100;
    }
  };

  const getPreviewStyle = () => ({
    filter: `brightness(${params.brightness}%) contrast(${params.contrast}%) saturate(${params.saturate}%) blur(${params.blur}px) opacity(${params.opacity}%)`,
    transform: `scale(${params.zoom}) rotate(${params.rotate}deg)`,
  });

  const getContainerAspectStyle = () => {
    const map: Record<AspectRatio, string> = {
      '16/9': '16/9', '9/16': '9/16', '1/1': '1/1', '4/3': '4/3', '21/9': '21/9'
    };
    return { aspectRatio: map[canvasAspect] };
  };

  // --- ACTIONS ---
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      overlayRef.current?.pause();
    } else {
      videoRef.current.play();
      overlayRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (overlayRef.current) overlayRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // --- AI SIMULATIONS ---
  const simulateAI = (name: string, callback?: () => void) => {
    setIsProcessingAI(name);
    setTimeout(() => {
      setIsProcessingAI(null);
      if (callback) callback();
      else alert(`Proceso "${name}" completado con éxito.`);
    }, 2000);
  };

  const handleRemoveBackground = () => simulateAI("Removiendo Fondo (IA)");
  const handleAutoSubtitles = () => simulateAI("Generando Subtítulos (IA)", () => setShowSubtitles(true));
  const handleStabilization = () => simulateAI("Estabilizando Video");
  const handleVoiceIsolation = () => simulateAI("Aislando Voz", () => updateParam('voiceIsolation', true));
  const handleReduceNoise = () => simulateAI("Reduciendo Ruido", () => updateParam('noiseReduction', true));
  const handleAutoEnhance = () => {
      simulateAI("Mejoramiento Automático", () => {
          setParams(prev => ({ ...prev, brightness: 110, contrast: 110, saturate: 115 }));
      });
  };
  const handleFreezeFrame = () => {
      if(videoRef.current) videoRef.current.pause();
      setIsPlaying(false);
      alert("Frame congelado añadido (simulado)");
  };
  const handleExtractAudio = () => {
      simulateAI("Extrayendo Audio", () => {
          const newAsset: Asset = {
              id: crypto.randomUUID(),
              type: AssetType.VIDEO, // Treating as video for demo, traditionally would be audio type
              url: selectedAsset?.url || '',
              prompt: `Audio de: ${selectedAsset?.prompt}`,
              createdAt: Date.now()
          };
          onAddAsset(newAsset);
          alert("Audio extraído y añadido a la biblioteca");
      });
  };

  // --- EDITING ACTIONS ---
  const handleSwapOverlay = () => {
      if (overlayAsset && selectedAsset) {
          const temp = selectedAsset;
          setSelectedAsset(overlayAsset);
          setOverlayAsset(temp);
      } else {
          alert("Necesitas una superposición activa para intercambiar.");
      }
  };

  const handleDuplicate = () => {
      if (selectedAsset) {
          const clone = { ...selectedAsset, id: crypto.randomUUID(), prompt: `${selectedAsset.prompt} (Copia)` };
          onAddAsset(clone);
      }
  };

  const handleDelete = () => {
      // In a real app we would remove from assets array. 
      // For this demo, we just clear selection if it's the only one, or warn.
      alert("Función de eliminar: El activo se eliminaría de la línea de tiempo.");
  };

  const handleExport = (quality: ExportQuality) => {
      simulateAI(`Renderizando en ${quality}`, () => {
        if (!selectedAsset) return;
        const link = document.createElement('a');
        link.href = selectedAsset.url;
        link.download = `cineai-${quality}-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
      });
  };

  // --- FILE UPLOAD ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      type: file.type.startsWith('video') ? AssetType.VIDEO : AssetType.IMAGE,
      url: objectUrl,
      prompt: file.name,
      createdAt: Date.now()
    };
    onAddAsset(newAsset);
    setSelectedAsset(newAsset);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- ICONS ---
  const icons = {
      cut: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" /></svg>,
      text: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>,
      layers: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      wand: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      audio: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
      export: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
      swap: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200 overflow-hidden font-sans">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*,image/*" />

      {/* 1. TOP BAR: Global Settings */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-20">
         <div className="flex items-center space-x-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">CineAI Pro</span>
            <div className="h-4 w-px bg-gray-700"></div>
            {/* Aspect Ratio Selector */}
            <select 
              value={canvasAspect} 
              onChange={(e) => setCanvasAspect(e.target.value as AspectRatio)}
              className="bg-gray-800 text-xs border border-gray-700 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
                <option value="16/9">16:9 (YouTube)</option>
                <option value="9/16">9:16 (TikTok/Reels)</option>
                <option value="1/1">1:1 (Instagram)</option>
                <option value="4/3">4:3 (TV)</option>
                <option value="21/9">21:9 (Cinema)</option>
            </select>
         </div>
         
         <div className="relative">
            <Button variant="primary" className="text-xs px-3 py-1.5" onClick={() => setShowExportMenu(!showExportMenu)}>
                {icons.export} <span className="ml-1">Exportar</span>
            </Button>
            {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded shadow-xl z-50">
                    <div className="p-2 space-y-1">
                        <button onClick={() => handleExport('720p')} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-700 rounded">720p HD</button>
                        <button onClick={() => handleExport('1080p')} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-700 rounded">1080p Full HD</button>
                        <button onClick={() => handleExport('4k')} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-700 rounded text-yellow-400 font-bold">4K Ultra HD ✨</button>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* LEFT: Toolbar Grid */}
         <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-4 border-r border-gray-800 z-10 overflow-y-auto custom-scrollbar">
            <TooltipButton label="Principal" active={activeToolCategory === 'main'} onClick={() => setActiveToolCategory('main')}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </TooltipButton>
            <TooltipButton label="Audio" active={activeToolCategory === 'audio'} onClick={() => setActiveToolCategory('audio')}>
                {icons.audio}
            </TooltipButton>
            <TooltipButton label="IA Magic" active={activeToolCategory === 'ai'} onClick={() => setActiveToolCategory('ai')} className="text-indigo-400">
                {icons.wand}
            </TooltipButton>
            <div className="w-8 h-px bg-gray-800 my-2"></div>
            
            {/* Quick Actions */}
            <TooltipButton label="Texto" onClick={() => setShowTextLayer(!showTextLayer)} active={showTextLayer}>{icons.text}</TooltipButton>
            <TooltipButton label="Subtítulos" onClick={handleAutoSubtitles} active={showSubtitles}><span className="font-bold text-[10px]">CC</span></TooltipButton>
            <TooltipButton label="Intercambiar" onClick={handleSwapOverlay} disabled={!overlayAsset}>{icons.swap}</TooltipButton>
            <TooltipButton label="Duplicar" onClick={handleDuplicate}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></TooltipButton>
            <TooltipButton label="Eliminar" onClick={handleDelete} className="text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></TooltipButton>
         </div>

         {/* CENTER: Canvas */}
         <div className="flex-1 bg-black relative flex items-center justify-center p-8">
            {/* Transparency Grid */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

            {/* Canvas Container */}
            <div 
              className="relative shadow-2xl bg-black transition-all duration-300 group"
              style={{ ...getContainerAspectStyle(), height: '100%', maxHeight: '65vh', width: 'auto' }}
            >
                {selectedAsset ? (
                    <>
                        {/* Main Layer */}
                        {selectedAsset.type === AssetType.VIDEO ? (
                            <video 
                                ref={videoRef}
                                src={selectedAsset.url} 
                                className="w-full h-full object-cover"
                                style={getPreviewStyle()}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                muted={false}
                                loop
                            />
                        ) : (
                            <img src={selectedAsset.url} className="w-full h-full object-cover" style={getPreviewStyle()} />
                        )}

                        {/* Overlay Layer (PiP) */}
                        {overlayAsset && (
                            <div className="absolute top-4 right-4 w-1/3 aspect-video border-2 border-indigo-500 shadow-lg z-10 overflow-hidden bg-black cursor-move">
                                {overlayAsset.type === AssetType.VIDEO ? (
                                    <video ref={overlayRef} src={overlayAsset.url} className="w-full h-full object-cover" muted loop />
                                ) : (
                                    <img src={overlayAsset.url} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute top-0 left-0 bg-indigo-600 text-[8px] px-1 text-white">Superposición</div>
                            </div>
                        )}

                        {/* Text Layer */}
                        {showTextLayer && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-white/50 p-2 cursor-move z-20">
                                <div 
                                    contentEditable 
                                    suppressContentEditableWarning
                                    className="text-4xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] outline-none text-center"
                                    onBlur={(e) => setTextLayerContent(e.currentTarget.innerText)}
                                >
                                    {textLayerContent}
                                </div>
                            </div>
                        )}

                        {/* Subtitles Layer (Mock) */}
                        {showSubtitles && (
                            <div className="absolute bottom-8 w-full text-center px-8 z-20">
                                <span className="bg-black/60 text-white px-2 py-1 rounded text-sm font-medium">
                                    [Subtítulos generados automáticamente por IA aparecerán aquí sincronizados]
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-600 border border-gray-800">
                        <div className="text-center">
                            <p className="mb-2">Sin contenido</p>
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="text-xs">Subir</Button>
                        </div>
                     </div>
                )}

                {/* Processing Overlay */}
                {isProcessingAI && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="text-indigo-400 font-mono text-sm animate-pulse">{isProcessingAI}...</p>
                    </div>
                )}
            </div>

            {/* Video Controls (Floating) */}
            {selectedAsset?.type === AssetType.VIDEO && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-2/3 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-full px-6 py-2 flex items-center space-x-4 shadow-2xl z-40">
                    <button onClick={togglePlay} className="text-white hover:text-indigo-400 focus:outline-none">
                        {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                    <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    <span className="text-[10px] font-mono text-gray-400 w-20 text-right">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
            )}
         </div>

         {/* RIGHT: Property Inspector */}
         <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-gray-800">
                <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">
                    {activeToolCategory === 'main' && 'Ajustes Visuales'}
                    {activeToolCategory === 'audio' && 'Mezclador de Audio'}
                    {activeToolCategory === 'ai' && 'Inteligencia Artificial'}
                </h3>
            </div>

            <div className="p-4 space-y-6">
                {activeToolCategory === 'main' && (
                    <>
                        <SliderControl label="Opacidad" value={params.opacity} min={0} max={100} onChange={(v) => updateParam('opacity', v)} unit="%" />
                        <SliderControl label="Escala (Zoom)" value={params.zoom} min={0.5} max={3} step={0.1} onChange={(v) => updateParam('zoom', v)} unit="x" />
                        <SliderControl label="Rotación" value={params.rotate} min={-180} max={180} onChange={(v) => updateParam('rotate', v)} unit="°" />
                        <div className="border-t border-gray-800 pt-4">
                            <SliderControl label="Brillo" value={params.brightness} min={0} max={200} onChange={(v) => updateParam('brightness', v)} unit="%" />
                            <SliderControl label="Contraste" value={params.contrast} min={0} max={200} onChange={(v) => updateParam('contrast', v)} unit="%" />
                            <SliderControl label="Saturación" value={params.saturate} min={0} max={200} onChange={(v) => updateParam('saturate', v)} unit="%" />
                            <SliderControl label="Blur" value={params.blur} min={0} max={20} step={0.5} onChange={(v) => updateParam('blur', v)} unit="px" />
                        </div>
                    </>
                )}

                {activeToolCategory === 'audio' && (
                    <>
                        <SliderControl label="Volumen Master" value={params.volume} min={0} max={100} onChange={(v) => updateParam('volume', v)} unit="%" />
                        <div className="space-y-2 pt-2">
                             <ActionButton label="Aislar Voz (IA)" onClick={handleVoiceIsolation} active={params.voiceIsolation} icon={<svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>} />
                             <ActionButton label="Reducir Ruido de Fondo" onClick={handleReduceNoise} active={params.noiseReduction} />
                             <ActionButton label="Extraer Audio del Video" onClick={handleExtractAudio} />
                        </div>
                        <div className="pt-4 border-t border-gray-800">
                             <p className="text-xs font-bold text-gray-500 mb-2">Velocidad</p>
                             <div className="flex space-x-1">
                                 {[0.5, 1, 1.5, 2].map(r => (
                                     <button key={r} onClick={() => updateParam('speed', r)} className={`flex-1 text-xs py-1 rounded border ${params.speed === r ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-700 text-gray-400'}`}>{r}x</button>
                                 ))}
                             </div>
                        </div>
                    </>
                )}

                {activeToolCategory === 'ai' && (
                    <div className="space-y-3">
                        <ActionButton label="Remover Fondo" onClick={handleRemoveBackground} icon={icons.wand} variant="magic" />
                        <ActionButton label="Mejoramiento Auto (Upscale)" onClick={handleAutoEnhance} icon={icons.wand} variant="magic" />
                        <ActionButton label="Estabilización de Video" onClick={handleStabilization} />
                        <ActionButton label="Seguimiento de Cámara" onClick={() => simulateAI("Aplicando Tracking")} />
                        <ActionButton label="Sincronización Labial" onClick={() => simulateAI("Analizando audio para LipSync")} />
                        <div className="h-px bg-gray-800 my-2"></div>
                        <ActionButton label="Congelar Frame (Freeze)" onClick={handleFreezeFrame} />
                    </div>
                )}
            </div>
         </div>
      </div>

      {/* 3. BOTTOM: Timeline / Library */}
      <div className="h-48 bg-gray-900 border-t border-gray-800 flex flex-col z-20">
         <div className="px-4 py-2 bg-gray-800 flex justify-between items-center shadow-lg">
             <div className="flex items-center space-x-4">
                 <h3 className="text-xs font-bold text-gray-300 uppercase">Línea de Tiempo</h3>
                 <div className="flex space-x-2">
                     <ToolIcon onClick={() => alert('Herramienta Dividir (Split)')} title="Dividir"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></ToolIcon>
                     <ToolIcon onClick={() => alert('Herramienta Recortar (Crop)')} title="Recortar"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></ToolIcon>
                 </div>
             </div>
             
             <div className="flex items-center space-x-3">
                 <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded shadow-lg shadow-indigo-500/30 transition">
                     + Subir Media
                 </button>
             </div>
         </div>

         <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden custom-scrollbar bg-gray-900/50">
             <div className="flex space-x-4 h-full items-center">
                 {assets.map((asset) => (
                     <div key={asset.id} className="relative group">
                        <div 
                           onClick={() => setSelectedAsset(asset)}
                           className={`w-40 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedAsset?.id === asset.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-gray-700 hover:border-gray-500'}`}
                        >
                             {asset.type === AssetType.VIDEO ? (
                                 <video src={asset.url} className="w-full h-full object-cover" />
                             ) : (
                                 <img src={asset.url} className="w-full h-full object-cover" />
                             )}
                        </div>
                        {/* Overlay Assign Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setOverlayAsset(asset); }}
                            className="absolute -top-2 -right-2 bg-gray-700 hover:bg-indigo-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 hover:scale-100"
                            title="Usar como superposición"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1 rounded text-gray-300 truncate max-w-[90%]">{asset.prompt}</span>
                     </div>
                 ))}
             </div>
         </div>
      </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const TooltipButton = ({ label, children, active, disabled, onClick, className = '' }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`relative group p-2 rounded-lg transition-colors ${active ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`}
    >
        {children}
        <span className="absolute left-14 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {label}
        </span>
    </button>
);

const SliderControl = ({ label, value, min, max, step = 1, onChange, unit }: any) => (
    <div className="mb-4">
        <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-400">{label}</label>
            <span className="text-xs text-indigo-400 font-mono">{Math.round(value)}{unit}</span>
        </div>
        <input 
            type="range" min={min} max={max} step={step} value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
    </div>
);

const ActionButton = ({ label, onClick, active, icon, variant }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg transition-all border ${
            active 
            ? 'bg-indigo-600 text-white border-indigo-500' 
            : variant === 'magic' 
              ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/30 text-indigo-200 hover:border-indigo-400'
              : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
        }`}
    >
        {icon}
        {label}
    </button>
);

const ToolIcon = ({ children, onClick, title }: any) => (
    <button onClick={onClick} title={title} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
        {children}
    </button>
);

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
