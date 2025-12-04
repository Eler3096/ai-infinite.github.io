
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Generator } from './components/Generator';
import { ViewMode, Asset } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.EDITOR);
  const [assets, setAssets] = useState<Asset[]>([]);

  const handleAssetGenerated = (asset: Asset) => {
    setAssets((prev) => [asset, ...prev]);
    // Switch back to editor to see the result if not already there
    if (currentView !== ViewMode.EDITOR) {
       setTimeout(() => setCurrentView(ViewMode.EDITOR), 100);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500/30">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        assetCount={assets.length} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-black/20 relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-indigo-900/10 blur-[120px] pointer-events-none" />
        
        <div className="flex-1 relative z-10 overflow-auto">
          {currentView === ViewMode.EDITOR && (
            <Editor assets={assets} onAddAsset={handleAssetGenerated} />
          )}
          
          {(currentView === ViewMode.GENERATE_VIDEO || currentView === ViewMode.GENERATE_IMAGE) && (
            <div className="h-full overflow-y-auto">
              <Generator 
                mode={currentView} 
                onAssetGenerated={handleAssetGenerated} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
