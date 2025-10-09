// Interfaces para Gemini AI Service

export interface GeminiModel {
  generateContent(prompt: string): Promise<GeminiGenerateContentResponse>;
}

export interface GeminiGenerateContentResponse {
  response: GeminiResponse;
}

export interface GeminiResponse {
  text(): string;
}

// Interface para las funciones disponibles en function calling
export interface AvailableFunction {
  name: string;
  description: string;
  parameters: string[];
}

// Interface para la configuración de generación
export interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

// Interface para el modelo de Gemini
export interface GeminiModelConfig {
  model: string;
  generationConfig?: GenerationConfig;
}
