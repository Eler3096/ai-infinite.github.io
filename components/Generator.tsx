import React, { useState, useEffect } from 'react';
import { ViewMode, Asset, AssetType } from '../types';
import { generateImage, generateVideo, checkApiKey, promptForApiKey } from '../services/aiService';
import { Button } from './Button';

interface GeneratorProps {
  mode: ViewMode;
  onAssetGenerated: (asset: Asset) => void;
}

export const Generator: React.FC<GeneratorProps> = ({ mode, onAssetGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  const isVideo = mode === ViewMode.GENERATE_VIDEO;
  const title = isVideo ? "Generador de Video Veo" : "Generador de Imagen Gemini";
  const description = isVideo 
    ? "Crea videos de alta definición (720p/1080p) usando el modelo más avanzado de Google." 
    : "Genera texturas, fondos o personajes para tus videos con Gemini 3 Pro.";

  useEffect(() => {
    // Check for API key on mount and when window focus changes (in case they just selected it)
    const verifyKey = async () => {
      const exists = await checkApiKey();
      setHasKey(exists);
    };
    
    verifyKey();
    window.addEventListener('focus', verifyKey);
    return () => window.removeEventListener('focus', verifyKey);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Safety check for API key
    if (!hasKey) {
      await promptForApiKey();
      const keyNow = await checkApiKey();
      setHasKey(keyNow);
      if (!keyNow) return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let asset: Asset;
      if (isVideo) {
        asset = await generateVideo(prompt, aspectRatio);
      } else {
        asset = await generateImage(prompt, aspectRatio);
      }
      onAssetGenerated(asset);
      setPrompt(''); // Clear prompt on success
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado durante la generación.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400">{description}</p>
      </div>

      {!hasKey && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-yellow-500 font-semibold mb-1">Requiere API Key</h3>
            <p className="text-sm text-yellow-200/70">Para usar los modelos premium (Veo/Pro), necesitas seleccionar una clave de proyecto con facturación habilitada.</p>
          </div>
          <Button onClick={async () => {
            await promptForApiKey();
            setHasKey(await checkApiKey());
          }} variant="secondary">
            Conectar Google Cloud
          </Button>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt (Descripción)</label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all h-32 resize-none placeholder-gray-600"
              placeholder={isVideo ? "Un astronauta caminando en marte, estilo cinematográfico..." : "Un paisaje futurista cyberpunk, neón, 8k..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Relación de Aspecto</label>
              <div className="grid grid-cols-3 gap-2">
                {['16:9', '9:16', '1:1'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            {isVideo && (
               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-2">Resolución</label>
                 <div className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-400">
                    720p (Vista Previa Rápida)
                 </div>
               </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-gray-700 flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !hasKey}
              isLoading={isGenerating}
              variant="primary"
              className="w-full sm:w-auto min-w-[150px]"
            >
              {isGenerating ? 'Creando Magia...' : 'Generar'}
            </Button>
          </div>
        </div>
      </div>
      
      {isGenerating && isVideo && (
        <div className="mt-8 text-center animate-pulse">
          <p className="text-indigo-400 font-medium">Generando video con Veo...</p>
          <p className="text-gray-500 text-sm mt-1">Esto puede tomar entre 30 a 60 segundos.</p>
        </div>
      )}
    </div>
  );
};