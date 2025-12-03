import React, { useState } from 'react';
import { Asset, AssetType } from '../types';
import { Button } from './Button';

interface EditorProps {
  assets: Asset[];
}

export const Editor: React.FC<EditorProps> = ({ assets }) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets.length > 0 ? assets[0] : null);

  // If new assets arrive and nothing selected, select first
  React.useEffect(() => {
    if (!selectedAsset && assets.length > 0) {
      setSelectedAsset(assets[0]);
    }
  }, [assets, selectedAsset]);

  const handleDownload = () => {
    if (!selectedAsset) return;
    const link = document.createElement('a');
    link.href = selectedAsset.url;
    link.download = `cineai-${selectedAsset.type}-${Date.now()}.${selectedAsset.type === AssetType.VIDEO ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Area: Preview & Properties */}
      <div className="flex-1 flex min-h-0">
        {/* Main Preview */}
        <div className="flex-1 bg-black flex items-center justify-center relative p-4">
          {selectedAsset ? (
            <div className="relative max-w-full max-h-full shadow-2xl">
              {selectedAsset.type === AssetType.VIDEO ? (
                <video 
                  src={selectedAsset.url} 
                  controls 
                  className="max-h-[60vh] rounded-lg border border-gray-800"
                  autoPlay
                  loop
                />
              ) : (
                <img 
                  src={selectedAsset.url} 
                  alt={selectedAsset.prompt} 
                  className="max-h-[60vh] object-contain rounded-lg border border-gray-800"
                />
              )}
              <div className="absolute top-4 right-4 flex space-x-2">
                 <span className="bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                   {selectedAsset.type}
                 </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8v8a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <p>Selecciona o genera un asset para comenzar</p>
            </div>
          )}
        </div>

        {/* Info/Properties Panel */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto hidden lg:block">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Propiedades</h3>
           {selectedAsset ? (
             <div className="space-y-4">
               <div>
                 <label className="text-xs text-gray-500">Prompt Original</label>
                 <p className="text-sm text-gray-200 mt-1 italic">"{selectedAsset.prompt}"</p>
               </div>
               <div>
                 <label className="text-xs text-gray-500">ID del Archivo</label>
                 <p className="text-xs text-gray-400 font-mono mt-1 break-all">{selectedAsset.id}</p>
               </div>
               <div>
                 <label className="text-xs text-gray-500">Creado</label>
                 <p className="text-sm text-gray-300 mt-1">{new Date(selectedAsset.createdAt).toLocaleString()}</p>
               </div>
               <div className="pt-4 border-t border-gray-800">
                 <Button onClick={handleDownload} variant="secondary" className="w-full text-xs">
                   Descargar Archivo
                 </Button>
               </div>
             </div>
           ) : (
             <p className="text-sm text-gray-600 italic">Nada seleccionado</p>
           )}
        </div>
      </div>

      {/* Bottom Area: Timeline / Asset Browser */}
      <div className="h-64 bg-gray-900 border-t border-gray-800 flex flex-col">
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-300">Línea de Tiempo / Biblioteca</h3>
          <div className="flex space-x-2 text-xs">
            <span className="text-gray-500">Total: {assets.length} items</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div className="flex space-x-4 h-full">
            {assets.length === 0 && (
              <div className="w-full flex items-center justify-center border-2 border-dashed border-gray-700 rounded-xl">
                <p className="text-gray-500 text-sm">No hay videos ni imágenes. Ve a "Generar" para crear contenido.</p>
              </div>
            )}
            {assets.map((asset) => (
              <div 
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`flex-shrink-0 w-64 h-full bg-gray-800 rounded-lg border-2 cursor-pointer transition-all overflow-hidden relative group ${
                  selectedAsset?.id === asset.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                {asset.type === AssetType.VIDEO ? (
                  <video src={asset.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <img src={asset.url} alt="asset" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                  <div className="flex items-center space-x-2">
                    {asset.type === AssetType.VIDEO ? (
                       <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                    ) : (
                       <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                    )}
                    <span className="text-xs text-white truncate font-medium">{asset.prompt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};