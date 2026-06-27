import { GoogleGenAI, Type } from '@google/genai';
import { HealthReport } from '../types/index';

// Initialize the Google GenAI SDK client with appropriate AI Studio metadata
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const systemInstruction = 
  "You are ConFile's code analysis engine. You analyze static HTML, CSS, and JavaScript structure data (not raw files) from a user's project being converted into a Blogger-compatible theme. " +
  "Identify syntax issues, unused or duplicate CSS, and accessibility problems such as missing alt text or form labels. Suggest minimal, specific fixes — never rewrite working code unnecessarily. " +
  "Produce a health score from 0-100 with a one-sentence reason. Never claim a fix is guaranteed to work on Blogger; only the post-validation XML parse can confirm that. " +
  "Never invent issues not present in the provided structure. Respond only in the exact JSON schema provided — no prose outside the JSON.";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    healthScore: { 
      type: Type.NUMBER, 
      description: "Health score rating from 0 to 100 based on standard static site principles." 
    },
    summary: { 
      type: Type.STRING, 
      description: "A solid, single-sentence summary description of the analysis feedback." 
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          file: { type: Type.STRING, description: "Name of the violating file." },
          line: { type: Type.NUMBER, description: "Target line number where the warning or fix centers." },
          severity: { 
            type: Type.STRING, 
            enum: ["error", "warning", "info"], 
            description: "Severity tier of the codebase rule violated." 
          },
          message: { type: Type.STRING, description: "Helpful human-readable explanation of what's wrong." },
          suggestedFix: { type: Type.STRING, description: "Exact string substitution or resolution fix." }
        },
        required: ["file", "line", "severity", "message", "suggestedFix"]
      }
    },
    unsupported: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A string array listing filenames or paths containing unconvertible dependencies (e.g. databases, server APIs)."
    }
  },
  required: ["healthScore", "summary", "issues", "unsupported"]
};

export async function generateContentWithFallback(
  contents: any,
  config: any,
  preferredModel: string = 'gemini-3.5-flash'
): Promise<any> {
  const modelsToTry = [
    preferredModel,
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini generation failed for model ${modelName} on attempt ${attempt}:`, err.message || err);
        
        const status = err.status || (err.error && err.error.code);
        if (status === 400 || status === 403 || status === 401) {
          throw err;
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }
  }

  throw lastError || new Error('All Gemini model queries and fallback retry configurations failed.');
}

export async function optimizeCodeWithAI(structureMetadataJson: string): Promise<HealthReport> {
  try {
    const response = await generateContentWithFallback(
      `Perform code health optimization on the following project metadata:\n${structureMetadataJson}`,
      {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema
      },
      'gemini-3.5-flash'
    );

    const text = response.text;
    if (!text) {
      throw new Error('Gemini model response content was empty.');
    }

    const report: HealthReport = JSON.parse(text.trim());
    return report;

  } catch (error: any) {
    console.error('Gemini static analysis engine service failure:', error);
    
    // Graceful degradation fallback object
    return {
      healthScore: 100,
      summary: 'Optimization analysis skipped — Gemini suggestion engine temporarily unavailable.',
      issues: [],
      unsupported: []
    };
  }
}
