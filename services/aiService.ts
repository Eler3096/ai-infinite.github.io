import { GoogleGenAI } from "@google/genai";
import { Asset, AssetType } from "../types";

// Helper to check for API Key
export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const promptForApiKey = async (): Promise<void> => {
  if (window.aistudio) {
    await window.aistudio.openSelectKey();
  } else {
    alert("El entorno de AI Studio no está disponible.");
  }
};

// Generate Image using Gemini 3 Pro (High Quality)
export const generateImage = async (prompt: string, aspectRatio: string = "16:9"): Promise<Asset> => {
  // Re-instantiate to ensure we get the latest selected key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use pro-image-preview for best quality results
  const model = 'gemini-3-pro-image-preview';

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any, 
        imageSize: "1K"
      }
    }
  });

  let imageUrl = '';
  
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!imageUrl) {
    throw new Error("No se pudo generar la imagen. Intenta de nuevo.");
  }

  return {
    id: crypto.randomUUID(),
    type: AssetType.IMAGE,
    url: imageUrl,
    thumbnail: imageUrl, // Use same for thumb in this demo
    prompt: prompt,
    createdAt: Date.now()
  };
};

// Generate Video using Veo
export const generateVideo = async (prompt: string, aspectRatio: string = "16:9"): Promise<Asset> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'veo-3.1-fast-generate-preview';

  // Start the operation
  let operation = await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio as any
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("La generación de video falló.");
  }

  // Fetch the actual binary data using the key
  const videoUrlWithKey = `${videoUri}&key=${process.env.API_KEY}`;
  const fetchResponse = await fetch(videoUrlWithKey);
  
  if (!fetchResponse.ok) {
     throw new Error("Error al descargar el video generado.");
  }
  
  const blob = await fetchResponse.blob();
  const objectUrl = URL.createObjectURL(blob);

  return {
    id: crypto.randomUUID(),
    type: AssetType.VIDEO,
    url: objectUrl,
    prompt: prompt,
    createdAt: Date.now()
  };
};