import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ConversionSession } from './src/types/index';
import { detectUnsupportedFiles } from './src/lib/detection';
import { runFullAnalysis } from './src/lib/parsing';
import { buildBloggerXml, validateBloggerXml } from './src/lib/xmlBuilder';
import { optimizeCodeWithAI, generateContentWithFallback } from './src/lib/gemini';
import { DOMParser } from 'xmldom';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const sessions = new Map<string, ConversionSession>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set high payload sizes to easily accommodate zip extractions/base64 uploads (up to 25MB)
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ limit: '60mb', extended: true }));

  // API Route - Step 1: Upload
  app.post('/api/upload', (req: any, res: any) => {
    try {
      const { files } = req.body;

      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'No files uploaded. Provide file list array.' });
      }

      // Pre-upload validation: sum sizes of uploaded files
      const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
      const limit = 25 * 1024 * 1024; // 25MB
      
      if (totalSize > limit) {
        return res.status(413).json({
          error: `Upload limits exceeded. Combined uploaded structure is ${(totalSize / (1024 * 1024)).toFixed(2)}MB, but the maximum allowed size is 25MB.`
        });
      }

      // Step 2: Detect servers & unsupported files
      const { supported, flagged } = detectUnsupportedFiles(files);

      const sessionId = Math.random().toString(36).substring(2, 17);
      
      const newSession: ConversionSession = {
        sessionId,
        files: supported,
        flagged
      };
      
      sessions.set(sessionId, newSession);

      return res.json({
        sessionId,
        files: supported.map(f => ({ name: f.name, size: f.size, type: f.type })),
        flagged
      });
    } catch (err: any) {
      console.error('Upload API failure:', err);
      return res.status(500).json({ error: `Internal Server Error during upload: ${err.message}` });
    }
  });

  // API Route - Step 3: Analyze
  app.post('/api/analyze', async (req: any, res: any) => {
    try {
      const { sessionId } = req.body;
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Active session not found. Please re-upload assets.' });
      }

      // Hard timeout promise of 20 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Analysis timed out after 20 seconds. Some of your uploaded files might be extremely large or complex. Try removing unnecessary vendor scripts.'));
        }, 20000);
      });

      // Execute code analysis as an async activity
      const analysisPromise = (async () => {
        return runFullAnalysis(session.files, session.flagged);
      })();

      // Race the calculation with the 20-second timeout guard
      const analysisResult = await Promise.race([analysisPromise, timeoutPromise]) as any;

      session.analysis = analysisResult;
      sessions.set(sessionId, session);

      return res.json(analysisResult);
    } catch (err: any) {
      console.error('Analysis API failure:', err);
      if (err.message && err.message.includes('timed out')) {
        return res.status(408).json({ error: err.message });
      }
      return res.status(500).json({ error: `Code analysis failed: ${err.message}` });
    }
  });

  // API Route - Step 4: Transform inlines & wrap XML
  app.post('/api/transform', (req: any, res: any) => {
    try {
      const { sessionId } = req.body;
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Active session not found. Please upload assets again.' });
      }

      const buildOutput = buildBloggerXml(session.files);
      
      // Run strict validation before returning to user
      const xmlErrors = validateBloggerXml(buildOutput.xml);
      if (xmlErrors.length > 0) {
        const formattedErrors = xmlErrors.map(e => `[Line ${e.line}] ${e.message}`);
        return res.status(400).json({
          error: `Generated Blogger XML failed compliance validation:\n• ${formattedErrors.join('\n• ')}`
        });
      }

      session.draftXml = buildOutput.xml;
      sessions.set(sessionId, session);

      return res.json({
        sessionId,
        xml: buildOutput.xml,
        inlinedImagesCount: buildOutput.inlinedImagesCount,
        externalImagesCount: buildOutput.externalImagesCount,
        filesMatchedCount: buildOutput.filesMatchedCount
      });
    } catch (err: any) {
      console.error('Transform XML API failure:', err);
      return res.status(500).json({ error: `Blogger XML merging process failed: ${err.message}` });
    }
  });

  // API Route - Step 5: Optimize (calls Gemini 3.5-flash with structure stats metadata)
  app.post('/api/optimize', async (req: any, res: any) => {
    try {
      const { sessionId } = req.body;
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Active session not found.' });
      }

      // Gather aggregated metadata rather than sending entire raw source files to retain token speed limits
      const statsMetadata = {
        filesCount: session.files.length,
        structure: (session.analysis?.structure || []).map(s => ({
          file: s.htmlFile,
          tags: Object.keys(s.tagsCount || {}),
          ids: s.ids,
          classes: s.classes
        })),
        selectors: (session.analysis?.selectors || []).map(sel => ({
          file: sel.cssFile,
          selectorsCount: sel.selectorsCount,
          sample: sel.sampleSelectors
        })),
        jsIssues: (session.analysis?.jsIssues || []).map(js => ({
          file: js.file,
          codeLine: js.code,
          message: js.message,
          line: js.line
        }))
      };

      const healthReport = await optimizeCodeWithAI(JSON.stringify(statsMetadata));
      session.healthReport = healthReport;
      sessions.set(sessionId, session);

      return res.json(healthReport);
    } catch (err: any) {
      console.error('AI Optimize API failure:', err);
      
      // Fallback response for graceful degradation
      const fallbackReport = {
        healthScore: 100,
        summary: 'AI Optimization skipped - server experienced a transient latency timeout or authentication limit.',
        issues: [],
        unsupported: []
      };
      return res.json(fallbackReport);
    }
  });

  // API Route - Step 6: Validate Blogger XML code server-side via xmldom
  app.post('/api/validate', (req: any, res: any) => {
    try {
      const { sessionId, xml } = req.body;
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Active session not found.' });
      }

      const activeXml = xml || session.draftXml || '';
      if (!activeXml) {
        return res.status(400).json({ error: 'No XML template layout exists to validate.' });
      }

      const errors = validateBloggerXml(activeXml);
      const valid = errors.length === 0;

      session.validation = { valid, errors };
      if (xml) {
        session.draftXml = xml; // Update saved copy
      }
      sessions.set(sessionId, session);

      return res.json({
        valid,
        errors
      });
    } catch (err: any) {
      console.error('Validation API failure:', err);
      return res.status(500).json({ error: `XML validation routine crashed: ${err.message}` });
    }
  });

  // API Route - Step 7: Real-time Mini AI Chat with context
  app.post('/api/chat', async (req: any, res: any) => {
    try {
      const { message, history, sessionId, plan, currentXml } = req.body;
      
      if (plan !== 'pro' && plan !== 'business') {
        return res.status(403).json({ error: 'AI Chat assistance and custom templates are exclusive to Pro and Business plans.' });
      }

      const chatSystemInstruction = 
        "You are ConFile's interactive AI Blogger Assistant. You help users structure, optimize, and customize Blogger XHTML/XML templates.\n" +
        "If the user is on the Business plan, they can request generation of brand-new custom Blogger XML themes or parts of their theme. " +
        "In corporate or custom mode, if they ask to make a template change or create a custom widget like a contact form, social links slider, or a dark-mode switcher into their theme, " +
        "you should provide the complete or modified Blogger XML code. Enclose the XML block in double-wrapped xml code blocks like: ````xml\n<code here>\n```` so the parser can easily extract it on the front-end.\n" +
        "Provide modern, direct, helpful answers that explain *why* something is done. If they are on the Pro plan, guide them but do not overwrite major layouts unless explicitly asked. Focus on helping them map HTML tags to Blogger's layout and responsive styles.\n" +
        "Here is the user's current Blogger XML code if active:\n" +
        (currentXml ? `\n\n[Current XML Theme Code]:\n${currentXml.substring(0, 40000)}` : "(None uploaded)");

      const contents = [];
      if (history && Array.isArray(history)) {
        for (const h of history) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await generateContentWithFallback(
        contents,
        {
          systemInstruction: chatSystemInstruction,
          temperature: 0.7,
        },
        'gemini-3.5-flash'
      );

      const reply = response.text || "I was unable to process that. Please try rephrasing your prompt.";
      
      let extractedXml: string | null = null;
      const xmlMatch = reply.match(/````xml\s*([\s\S]*?)\s*````/) || reply.match(/```xml\s*([\s\S]*?)\s*```/);
      if (xmlMatch) {
        extractedXml = xmlMatch[1].trim();
      }

      return res.json({
        text: reply,
        extractedXml
      });
    } catch (err: any) {
      console.error('Chat API failure:', err);
      return res.status(500).json({ error: `AI Chat experienced an issue: ${err.message}` });
    }
  });

  // Mount API paths first. Then handle static app content binding
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConFile Full-Stack server is operational on port ${PORT}`);
  });
}

startServer();
