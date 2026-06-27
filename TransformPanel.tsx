import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Check, Loader, RefreshCw, ChevronRight, FileCode, CheckCircle2,
  AlertTriangle, Play, HelpCircle, Sparkles, Code2, Download, Trash2, Edit, Brain,
  Send, MessageSquare, Eye, Laptop, Smartphone, Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { FileEntry, FlaggedFile, AnalysisResult, HealthReport, ValidationError, OptimizeIssue } from '../types/index';
import BrandLogo from './BrandLogo';

type ActiveStep = 'Upload' | 'Analyze' | 'Transform' | 'Optimize' | 'Ready';

interface TransformPanelProps {
  currentPlan: 'free' | 'pro' | 'business';
  freeConversionsLeft: number;
  setFreeConversionsLeft: React.Dispatch<React.SetStateAction<number>>;
  onSelectPlan: (plan: 'free' | 'pro' | 'business') => void;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

const steps: { name: ActiveStep; label: string }[] = [
  { name: 'Upload', label: 'Upload Code' },
  { name: 'Analyze', label: 'Static Analysis' },
  { name: 'Transform', label: 'Inline & Compile' },
  { name: 'Optimize', label: 'AI Code Fixes' },
  { name: 'Ready', label: 'Ready for Blogger' }
];

const SkeletonLoader = () => (
  <div className="w-full space-y-4 animate-pulse p-4">
    <div className="h-4 bg-white/10 rounded-md w-3/4" />
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded-md w-full" />
      <div className="h-3 bg-[#D946EF]/5 rounded-md w-11/12" />
      <div className="h-3 bg-white/5 rounded-md w-5/6" />
    </div>
    <div className="h-4 bg-white/10 rounded-md w-1/2" />
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded-md w-full" />
      <div className="h-3 bg-white/5 rounded-md w-2/3" />
    </div>
  </div>
);

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-lg border border-white/10 bg-[#06060c] overflow-hidden max-w-full">
      <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5 text-[10px] font-mono text-white/50 font-bold uppercase tracking-wider shrink-0">
        <span>{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white transition-colors flex items-center space-x-1"
          title="Copy code to clipboard"
        >
          {copied ? <span className="text-emerald-400 font-bold">✓ Copied</span> : <span>Copy</span>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[11px] md:text-xs font-mono text-[#E9D5FF] bg-[#030307] max-w-full">
        <code className="block select-text break-all whitespace-pre-wrap">{code}</code>
      </pre>
    </div>
  );
};

const renderChatMessageText = (text: string, sender: 'user' | 'assistant') => {
  if (sender === 'user') {
    return <div className="whitespace-pre-wrap select-text break-words text-xs md:text-sm text-white font-mono leading-relaxed">{text}</div>;
  }

  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-3.5 text-xs md:text-sm text-white break-words leading-relaxed select-text font-sans w-full overflow-hidden">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const codeLines = part.slice(3, -3).trim().split('\n');
          let language = 'code';
          let codeContent = part.slice(3, -3);
          
          if (codeLines.length > 0 && codeLines[0].trim().length > 0 && !codeLines[0].includes(' ') && codeLines[0].trim().length < 15) {
            language = codeLines[0].trim();
            codeContent = codeLines.slice(1).join('\n');
          }
          
          return (
            <div key={index} className="w-full">
              <CodeBlock code={codeContent} language={language} />
            </div>
          );
        }

        const inlineParts = part.split(/(`[^`\n]+`)/g);
        return (
          <p key={index} className="leading-relaxed whitespace-pre-wrap break-words text-white">
            {inlineParts.map((subPart, subIdx) => {
              if (subPart.startsWith('`') && subPart.endsWith('`')) {
                return (
                  <code key={subIdx} className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[#D946EF] text-[11px] font-medium mx-0.5 break-all">
                    {subPart.slice(1, -1)}
                  </code>
                );
              }
              return subPart;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default function TransformPanel({ 
  currentPlan, 
  freeConversionsLeft, 
  setFreeConversionsLeft, 
  onSelectPlan 
}: TransformPanelProps) {
  // Session / pipeline state
  const [sessionId, setSessionId] = useState<string>('');
  const [activeStep, setActiveStep] = useState<ActiveStep>('Upload');
  const [completedSteps, setCompletedSteps] = useState<ActiveStep[]>([]);
  const [loadingStep, setLoadingStep] = useState<ActiveStep | null>(null);

  // File states
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [flaggedFiles, setFlaggedFiles] = useState<FlaggedFile[]>([]);
  const [fileDetails, setFileDetails] = useState<FileEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');

  // Step-specific structures
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [draftXml, setDraftXml] = useState<string>('');
  const [originalDraftXml, setOriginalDraftXml] = useState<string>('');
  const [convertedStats, setConvertedStats] = useState<{
    inlinedImages: number;
    externalImages: number;
    filesMatched: number;
  } | null>(null);

  // Gemini optimization states
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [appliedFixesCount, setAppliedFixesCount] = useState<number>(0);

  // Validation states
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationStatus, setValidationStatus] = useState<'pending' | 'validating' | 'valid' | 'invalid'>('pending');
  const [xmlErrors, setXmlErrors] = useState<ValidationError[]>([]);

  // Mini AI Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'assistant', text: 'Hi! I am your AI Blogger Developer. Upload your dynamic static files or project and I will compile them. I am online in Pro and Business plans to help you customize, solve structural challenges, and generate specialized components!' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Custom Generative Theme prompt (Business plan)
  const [componentPrompt, setComponentPrompt] = useState<string>('');
  const [isGeneratingComponent, setIsGeneratingComponent] = useState<boolean>(false);

  // Real-time Preview states
  const [previewTab, setPreviewTab] = useState<'preview' | 'source_code' | 'xml_code' | 'details'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [downloadErrors, setDownloadErrors] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Advanced progress loading indicators with countdown estimations
  const [estimatedSeconds, setEstimatedSeconds] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;
    let tickerTimer: NodeJS.Timeout;

    if (loadingStep) {
      let totalSecs = 15;
      let initialMsg = 'Initializing compile sequence...';
      const tickers: string[] = [];

      if (loadingStep === 'Upload') {
        totalSecs = 6;
        initialMsg = 'Preparing files for compilation flow...';
        tickers.push(
          'Compressing directories...',
          'Formatting image elements...',
          'Clearing redundant modules...'
        );
      } else if (loadingStep === 'Analyze') {
        totalSecs = 10;
        initialMsg = 'Running static structural analysis...';
        tickers.push(
          'Constructing HTML DOM map...',
          'Evaluating PostCSS template rules...',
          'Auditing DOM attributes consistency...'
        );
      } else if (loadingStep === 'Transform') {
        totalSecs = 8;
        initialMsg = 'Inlining scripts and styles skins...';
        tickers.push(
          'Assembling compiled XML stylesheet...',
          'Writing XHTML protection wrappers...',
          'Encoding icons under 100KB to Base64...'
        );
      } else if (loadingStep === 'Optimize') {
        totalSecs = 15;
        initialMsg = 'Consulting Gemini AI structural insights...';
        tickers.push(
          'Benchmarking Blogger XML layout patterns...',
          'Detecting script performance hooks...',
          'Generating immediate design ratings...'
        );
      }

      setEstimatedSeconds(totalSecs);
      setLoadingProgress(0);
      setLoadingMessage(initialMsg);

      // Decrement counter
      timer = setInterval(() => {
        setEstimatedSeconds(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);

      // Advance progress smoothly
      let currentProgress = 0;
      progressTimer = setInterval(() => {
        currentProgress += (100 / (totalSecs * 10)); 
        if (currentProgress < 98) {
          setLoadingProgress(Math.floor(currentProgress));
        }
      }, 100);

      // Rotate tickers
      let tickerIdx = 0;
      if (tickers.length > 0) {
        tickerTimer = setInterval(() => {
          tickerIdx = (tickerIdx + 1) % tickers.length;
          setLoadingMessage(tickers[tickerIdx]);
        }, 2200);
      }
    } else {
      setLoadingProgress(0);
      setEstimatedSeconds(0);
      setLoadingMessage('');
    }

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
      clearInterval(tickerTimer);
    };
  }, [loadingStep]);

  const triggerReset = () => {
    setSessionId('');
    setActiveStep('Upload');
    setCompletedSteps([]);
    setLoadingStep(null);
    setUploadedFiles([]);
    setFlaggedFiles([]);
    setFileDetails([]);
    setActiveTab('');
    setErrorText('');
    setAnalysis(null);
    setDraftXml('');
    setOriginalDraftXml('');
    setConvertedStats(null);
    setHealth(null);
    setAppliedFixesCount(0);
    setIsValidating(false);
    setValidationStatus('pending');
    setXmlErrors([]);
    setPreviewTab('preview');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUpload(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUpload(files);
    }
  };

  const processUpload = async (fileList: FileList) => {
    // Free tier usage gates
    if (currentPlan === 'free' && freeConversionsLeft <= 0) {
      setErrorText('You have reached the limit of 10 free conversions. Upgrade to Pro or Business to enjoy continuous conversion work with advanced AI tools!');
      return;
    }

    setErrorText('');
    setLoadingStep('Upload');
    setLoadingProgress(5);
    const ufiles: { name: string; content: string; size: number }[] = [];
    let totalSize = 0;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        totalSize += file.size;

        if (totalSize > 25 * 1024 * 1024) {
          setErrorText('Total upload size limits exceeded 25MB check boundary.');
          setLoadingStep(null);
          return;
        }

        if (file.name.endsWith('.zip')) {
          const zip = new JSZip();
          const zipData = await zip.loadAsync(file);

          for (const [relPath, zipEntry] of Object.entries(zipData.files)) {
            if (!zipEntry.dir) {
              const isBinaryImg = /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(relPath);
              if (isBinaryImg) {
                const base64Content = await zipEntry.async('base64');
                const extension = relPath.split('.').pop()?.toLowerCase() || 'png';
                const fileContent = `data:image/${extension};base64,${base64Content}`;
                ufiles.push({
                  name: relPath,
                  content: fileContent,
                  size: (zipEntry as any)._data?.uncompressedSize || base64Content.length
                });
              } else {
                const textContent = await zipEntry.async('text');
                ufiles.push({
                  name: relPath,
                  content: textContent,
                  size: textContent.length
                });
              }
            }
          }
        } else {
          const isBinaryImg = /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(file.name);
          if (isBinaryImg) {
            const reader = new FileReader();
            const promise = new Promise<string>((resolve) => {
              reader.onload = (e) => resolve(e.target?.result as string || '');
              reader.readAsDataURL(file);
            });
            const dataUrl = await promise;
            ufiles.push({ name: file.name, content: dataUrl, size: file.size });
          } else {
            const textContent = await file.text();
            ufiles.push({ name: file.name, content: textContent, size: file.size });
          }
        }
      }

      if (ufiles.length === 0) {
        setErrorText('No valid static assets or .html inputs found.');
        setLoadingStep(null);
        return;
      }

      // Step 2: server-side session allocation
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: ufiles })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server rejected file upload session.');
      }

      const res = await response.json();
      setSessionId(res.sessionId);
      setUploadedFiles(res.files);
      setFlaggedFiles(res.flagged);

      const remappedFiles: FileEntry[] = ufiles.map(f => {
        let fileType: 'html' | 'css' | 'js' | 'other' = 'other';
        const name = f.name.toLowerCase();
        if (name.endsWith('.html') || name.endsWith('.htm')) fileType = 'html';
        else if (name.endsWith('.css')) fileType = 'css';
        else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.mjs')) fileType = 'js';
        
        return {
          name: f.name,
          content: f.content,
          type: fileType,
          size: f.size
        };
      });
      setFileDetails(remappedFiles);

      const firstSupported = remappedFiles.find(f => f.type !== 'other') || remappedFiles[0];
      if (firstSupported) {
        setActiveTab(firstSupported.name);
      }

      setCompletedSteps(['Upload']);

      // COGNITIVE UPGRADE - Run full auto pipeline conversion flow instantly!
      await runAutomatedPipeline(res.sessionId, remappedFiles);

    } catch (err: any) {
      setErrorText(err.message || 'Error occurred during file extractions pipeline preparation.');
      setLoadingStep(null);
    }
  };

  /**
   * Complete standard or advanced compiling, formatting, and validation chain in one click
   */
  const runAutomatedPipeline = async (activeSessionId: string, currentFiles: FileEntry[]) => {
    try {
      // 1. Static Analyze Phase
      setLoadingStep('Analyze');
      setLoadingProgress(25);
      const analyzeResp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId })
      });
      if (!analyzeResp.ok) {
        let serverMsg = '';
        try {
          const errJson = await analyzeResp.json();
          serverMsg = errJson.error || '';
        } catch {}
        throw new Error(serverMsg || 'Step failed with no additional details (HTTP ' + analyzeResp.status + ')');
      }
      const analyzeData = await analyzeResp.json();
      setAnalysis(analyzeData);
      setCompletedSteps(prev => [...prev, 'Analyze']);

      // 2. Inline Transform Compiler Phase
      setLoadingStep('Transform');
      setLoadingProgress(55);
      const transformResp = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId })
      });
      if (!transformResp.ok) {
        let serverMsg = '';
        try {
          const errJson = await transformResp.json();
          serverMsg = errJson.error || '';
        } catch {}
        throw new Error(serverMsg || 'Step failed with no additional details (HTTP ' + transformResp.status + ')');
      }
      const transformData = await transformResp.json();
      setDraftXml(transformData.xml);
      setOriginalDraftXml(transformData.xml);
      setConvertedStats({
        inlinedImages: transformData.inlinedImagesCount,
        externalImages: transformData.externalImagesCount,
        filesMatched: transformData.filesMatchedCount
      });
      setCompletedSteps(prev => [...prev, 'Transform']);

      // 3. AI Code Fix Optimization Phase
      setLoadingStep('Optimize');
      setLoadingProgress(75);
      let resultingXml = transformData.xml;

      if (currentPlan === 'free') {
        // Free plan skips the heavy AI optimization step so conversion resolves instantly!
        setHealth({
          healthScore: 100,
          summary: 'Standard blogger templates compiled & formatted smoothly.',
          issues: [],
          unsupported: []
        });
        setCompletedSteps(prev => [...prev, 'Optimize']);
      } else {
        // Pro & Business plans execute high intelligence code feedback
        const optimizeResp = await fetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId })
        });
        if (!optimizeResp.ok) {
          let serverMsg = '';
          try {
            const errJson = await optimizeResp.json();
            serverMsg = errJson.error || '';
          } catch {}
          throw new Error(serverMsg || 'Step failed with no additional details (HTTP ' + optimizeResp.status + ')');
        }
        const optimizeData = await optimizeResp.json();
        setHealth(optimizeData);
        setCompletedSteps(prev => [...prev, 'Optimize']);
      }

      // 4. Server XML parsing & validation validation routine
      setLoadingStep('Ready');
      setLoadingProgress(92);
      await runBloggerXMLValidation(activeSessionId, resultingXml);

      // Decrement conversion count for Free Tier on successful outcome!
      if (currentPlan === 'free') {
        setFreeConversionsLeft(prev => Math.max(0, prev - 1));
      }

      setActiveStep('Ready');
      setCompletedSteps(prev => prev.includes('Ready') ? prev : [...prev, 'Ready']);
    } catch (err: any) {
      setErrorText(err.message || 'Pipeline conversion process crashed. Verify your source code syntactic patterns.');
      setActiveStep('Upload');
      setCompletedSteps([]);
    } finally {
      setLoadingStep(null);
      setLoadingProgress(0);
    }
  };

  const runBloggerXMLValidation = async (activeSessionId: string, xmlString: string) => {
    setIsValidating(true);
    setValidationStatus('validating');
    setXmlErrors([]);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, xml: xmlString })
      });

      if (!response.ok) {
        let serverMsg = '';
        try {
          const errJson = await response.json();
          serverMsg = errJson.error || '';
        } catch {}
        throw new Error(serverMsg || 'Step failed with no additional details (HTTP ' + response.status + ')');
      }

      const data = await response.json();
      if (data.valid) {
        setValidationStatus('valid');
      } else {
        setValidationStatus('invalid');
        setXmlErrors(data.errors || []);
      }
    } catch (err: any) {
      setValidationStatus('invalid');
      setXmlErrors([{ line: 1, message: `XML Engine Exception: ${err.message}` }]);
      throw err;
    } finally {
      setIsValidating(false);
    }
  };

  // Mini AI chat context integration
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    if (currentPlan !== 'pro' && currentPlan !== 'business') {
      const systemReply: ChatMessage = {
        sender: 'assistant',
        text: '⚠️ Real-Time AI Chat assistance is exclusive to our Pro and Business editions! Try selecting a Pro or Business plan using the simulation widget at the top or the pricing cards below to inspect the AI answers live.'
      };
      setChatHistory(prev => [...prev, { sender: 'user', text: chatInput }, systemReply]);
      setChatInput('');
      return;
    }

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const lastMessages = chatHistory.slice(-6).map(c => ({
        role: c.sender === 'user' ? 'user' : 'model',
        text: c.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: lastMessages,
          sessionId,
          plan: currentPlan,
          currentXml: draftXml
        })
      });

      if (!res.ok) {
        throw new Error('AI Engine is processing high query volume. Please wait.');
      }

      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'assistant', text: data.text }]);

      // If they asked to modify, and AI generated customized XML, inject it!
      if (data.extractedXml && currentPlan === 'business') {
        setDraftXml(data.extractedXml);
        await runBloggerXMLValidation(sessionId, data.extractedXml);
        
        setChatHistory(prev => [...prev, { 
          sender: 'assistant', 
          text: '✨ I have updated your Blogger XML with the requested component structures! Check the live real-time preview frame on the right side.' 
        }]);
      }

    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: 'assistant', text: `Sorry, I met an error: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Custom Blogger design creator for Business plans
  const handleGenerateCustomThemeElement = async () => {
    if (!componentPrompt.trim()) return;
    if (currentPlan !== 'business') {
      alert('Custom Generative Theme constructor is exclusive to our Business Enterprise edition. Select the Business plan above to use this generator!');
      return;
    }

    setIsGeneratingComponent(true);
    try {
      const userMessage = `Create or update my active blogger template with: "${componentPrompt}". Return the complete well-formed XHTML XML template structure code wrapped in code tags.`;
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          plan: 'business',
          currentXml: draftXml || `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html b:css='false' b:defaultmessages='false' b:layoutsVersion='3' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b'>
  <head>
    <title>Dynamic Theme</title>
    <b:skin><![CDATA[
      body { background: #0c0c16; color: #ffffff; font-family: sans-serif; padding: 40px; text-align: center; }
      .glow-banner { border: 1px solid #d946ef; padding: 30px; border-radius: 12px; background: rgba(217,70,239,0.05); }
    ]]></b:skin>
  </head>
  <body>
    <b:section id='confile-theme-wrapper'>
      <b:widget id='Blog1' locked='false' type='Blog'>
        <b:includable id='main'>
          <div id="confile-static-content">
            <div class="glow-banner">
              <h2>My Custom Generative Website</h2>
              <p>Type prompts to ask me to generate specialized segments dynamically!</p>
            </div>
          </div>
        </b:includable>
      </b:widget>
    </b:section>
  </body>
</html>`
        })
      });

      if (!res.ok) throw new Error('Custom generator experienced latency limits.');

      const data = await res.json();
      if (data.extractedXml) {
        setDraftXml(data.extractedXml);
        await runBloggerXMLValidation(sessionId || 'simulated', data.extractedXml);
        setComponentPrompt('');
      } else {
        alert('AI was unable to formulate a complete XML block. Try specifying "generate a custom widget or edit styles" more clearly.');
      }
    } catch (err: any) {
      alert(`Custom generator failed: ${err.message}`);
    } finally {
      setIsGeneratingComponent(false);
    }
  };

  // Extract CSS, HTML, and JS components from the generated Blogger XML for exact real-time sandbox visualization!
  const getLivePreviewSrcDoc = () => {
    if (!draftXml) {
      return `
        <div style="background:#0F0F1A;min-height:90vh;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-family:sans-serif;font-size:13px;text-align:center;padding:30px;">
          <div>
            <div style="font-size:32px;margin-bottom:15px;">📥</div>
            Upload static code or drop templates files to compile and auto-generate live webpage views here.
          </div>
        </div>
      `;
    }

    try {
      // Find Blogger skin styling blocks
      const cssMatch = draftXml.match(/<b:skin>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/b:skin>/) || 
                       draftXml.match(/<b:skin>([\s\S]*?)<\/b:skin>/);
      const css = cssMatch ? cssMatch[1] : '';

      // Find primary wrapper div or anything under includable
      const bodyMatch = draftXml.match(/<div id="confile-static-content"([\s\S]*?)>([\s\S]*?)<\/div>\s*<!--\s*Inlined/i) || 
                       draftXml.match(/<div id="confile-static-content"([\s\S]*?)>([\s\S]*?)<\/div>/i);
      
      const bodyAttrs = bodyMatch ? bodyMatch[1] : 'style="padding: 20px;"';
      const bodyHtml = bodyMatch ? bodyMatch[2] : '<h2>Webpage rendered. No static container found.</h2>';

      // Find compiled script modules
      const scriptMatch = draftXml.match(/<script type='text\/javascript'>\s*\/\/<!\[CDATA\[([\s\S]*?)\/\/\]\]>\s*<\/script>/) ||
                          draftXml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      const js = scriptMatch ? scriptMatch[1] : '';

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              /* Base styling */
              body { margin: 0; padding: 0; min-height: 100vh; background-color: #0A0A0F; color: #E5E7EB; font-family: system-ui, -apple-system, sans-serif; }
              ${css}
            </style>
          </head>
          <body ${bodyAttrs}>
            ${bodyHtml}
            <script>
              try {
                ${js}
              } catch(e) {
                console.error("Preview Script Execution Failed: ", e);
              }
            </script>
          </body>
        </html>
      `;
    } catch (err: any) {
      return `<h3>Unable to render live preview: ${err.message}</h3>`;
    }
  };

  const validateXmlForDownload = (xml: string): string[] => {
    const errors: string[] = [];
    
    // 1. Confirm XML is well-formed (using DOMParser)
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        errors.push(`XML Well-formedness Syntax Error: ${parserError.textContent}`);
      }
    } catch (err: any) {
      errors.push(`XML parser crashed during well-formedness validation check: ${err.message}`);
    }

    // 2. Confirm the root <html> tag exists
    const rootHtmlMatch = /<html\b[^>]*>/i.exec(xml);
    if (!rootHtmlMatch) {
      errors.push("Blogger Rule Error: Root <html> element tag is missing.");
    }

    // 3. Confirm <b:skin><![CDATA[...]]></b:skin> exists inside <head>
    const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(xml);
    if (!headMatch) {
      errors.push("Blogger Rule Error: Missing <head> tag block in template.");
    } else {
      const headContent = headMatch[1];
      const hasSkinCDATAInHead = /<b:skin\b[^>]*>[\s\S]*?<!\[CDATA\[[\s\S]*?\]\]>[\s\S]*?<\/b:skin>/i.test(headContent);
      if (!hasSkinCDATAInHead) {
        errors.push("Blogger Rule Error: <b:skin> with CDATA block (<![CDATA[...]]>) for CSS styles is missing or not placed inside the <head> element block.");
      }
    }

    // 4. Confirm no element anywhere uses id='navbar' (reserved by Blogger)
    if (/\bid\s*=\s*['"]navbar['"]/i.test(xml)) {
      errors.push("Blogger Rule Error: Reserved 'navbar' ID is not allowed inside a Blogger template (layout conflicts).");
    }

    // 5. Confirm there is no outer <blogger> wrapper tag
    if (/<blogger[\s>]/i.test(xml) || /<\/blogger>/i.test(xml)) {
      errors.push("Blogger Rule Error: Outer <blogger> tags must not wrap the template document.");
    }

    // 6. Provide hint for unescaped characters if parsing failed
    if (errors.length > 0 && errors.some(e => e.includes("Syntax Error") || e.includes("Well-formedness"))) {
      if (xml.includes('&') && !/&\w+;/i.test(xml) && !xml.includes('<![CDATA[')) {
        errors.push("XML Well-formedness Hint: You may have unescaped '&' characters in your code. Replace '&' with '&amp;' or enclose script fragments in CDATA blocks.");
      }
    }

    return errors;
  };

  const handleDownloadXml = () => {
    setDownloadErrors([]);
    const errors = validateXmlForDownload(draftXml);
    if (errors.length > 0) {
      setDownloadErrors(errors);
      return;
    }

    // 1. Explicitly strip any potential BOM and trim start
    let cleanXml = draftXml.replace(/^\uFEFF/, '').trimStart();

    // 2. Ensure final string starts EXACTLY with '<?xml' as the first 5 characters
    if (cleanXml.slice(0, 5) !== '<?xml') {
      const startOfXml = Array.from(cleanXml.slice(0, 10)).map(c => {
        if (c === '\n') return '\\n';
        if (c === '\r') return '\\r';
        return c;
      }).join('');
      const errMsg = `Blogger Download Security Violation: The final XML string must start with exactly '<?xml' as the first 5 characters. Currently starts with: "${startOfXml}"`;
      setDownloadErrors(prev => [...prev, errMsg]);
      throw new Error(errMsg);
    }

    // 3. Pre-download self-check verifying strict regex with zero characters before it
    const strictHeaderRegex = /^<\?xml\s+version="1\.0"\s+encoding="UTF-8"\s*\?>\r?\n<!DOCTYPE html>/i;
    if (!strictHeaderRegex.test(cleanXml)) {
      const headerSample = cleanXml.slice(0, 60).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
      const errMsg = `Blogger Download Security Violation: Output must begin exactly with standard <?xml version="1.0" encoding="UTF-8" ?> followed by newline and <!DOCTYPE html> with no leading characters. Found start: "${headerSample}"`;
      setDownloadErrors(prev => [...prev, errMsg]);
      return;
    }

    // 4. Construct Blob with application/xml type, omitting charset parameter to let xml encoding be the sole source of truth
    const blob = new Blob([cleanXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'confile-theme-blogger.xml');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStepStatus = (stepName: ActiveStep) => {
    if (loadingStep === stepName) return 'active';
    if (completedSteps.includes(stepName)) return 'done';
    if (activeStep === stepName) return 'active';
    return 'pending';
  };

  return (
    <section id="transform-panel-section" className="py-12 max-w-[1240px] mx-auto px-6 relative bg-[#020205]">
      <h2 className="sr-only">ConFile Transformation Engine</h2>

      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[640px] border border-white/5 bg-[#05050A]">
        {/* Core Header Navigation Panel */}
        <div className="border-b border-white/5 bg-[#0A0A12] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <span className="text-sm font-bold uppercase tracking-wider text-white">Compiler Workspace</span>
            <span className="text-[10px] font-mono text-[#D946EF] bg-[#D946EF]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Mode: {currentPlan === 'free' ? 'Standard Free' : currentPlan === 'pro' ? 'Professional Pro' : 'Enterprise Business'}
            </span>
            {currentPlan === 'free' && (
              <span className="text-[10px] font-mono text-[#9CA3AF] bg-white/5 px-2 py-0.5 rounded">
                Conversions Left: {freeConversionsLeft}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="confile-reset-all"
              onClick={triggerReset}
              className="text-xs text-[#9CA3AF] hover:text-[#F87171] bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 transition-all flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Workspace</span>
            </button>
          </div>
        </div>

        {/* Vertical/Horizontal step tracker indicator */}
        <div className="bg-[#08080E] border-b border-white/5 py-3.5 px-6 flex items-center overflow-x-auto gap-2 text-nowrap scrollbar-none scroll-smooth">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.name);
            return (
              <div key={step.name} className="flex items-center space-x-3 mr-4">
                <div className="flex items-center space-x-2">
                  {status === 'active' && (
                    <div className="w-5 h-5 rounded-full border-2 border-[#D946EF] border-t-transparent animate-spin flex items-center justify-center" />
                  )}
                  {status === 'done' && (
                    <CheckCircle2 className="w-5 h-5 text-[#34D399] fill-[#34D399]/10" />
                  )}
                  {status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-sans text-white/40">
                      {idx + 1}
                    </div>
                  )}

                  <span className={`text-xs font-semibold ${
                    status === 'active' ? 'text-[#D946EF] font-bold' : 
                    status === 'done' ? 'text-[#34D399]' : 'text-[#9CA3AF]'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-white/15" />
                )}
              </div>
            );
          })}
        </div>

        {/* Master Panel Core */}
        <div className="flex flex-col lg:flex-row flex-grow relative min-h-[580px]">
          {/* Centralized Pipeline Overlay Loading Screen */}
          <AnimatePresence>
            {loadingStep && (
              <motion.div
                id="confile-pipeline-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-[#04040A]/85 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="max-w-md w-full p-8 rounded-2xl border border-white/10 bg-[#0C0C15] shadow-2xl text-center space-y-6">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-[#D946EF]/20 border-t-[#D946EF] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D946EF] to-[#EC4899] text-base animate-pulse">
                        ConFile
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-display font-bold text-sm text-[#F5F5F7] uppercase tracking-wider">
                      {loadingStep === 'Upload' && 'Structuring static uploads...'}
                      {loadingStep === 'Analyze' && 'DOM Parser in action...'}
                      {loadingStep === 'Transform' && 'XML Inlining compiling styles...'}
                      {loadingStep === 'Optimize' && 'AI static health checks...'}
                    </h4>
                    <p className="text-xs text-[#9CA3AF] min-h-[36px] font-mono leading-relaxed">
                      {loadingMessage}
                    </p>
                  </div>

                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#9CA3AF]">
                      <span>Processing Progress:</span>
                      <span className="font-bold">{loadingProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#D946EF] to-[#EC4899] rounded-full transition-all duration-150" style={{ width: `${loadingProgress}%` }} />
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center space-x-2.5 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                    <span className="text-[#9CA3AF]">Estimated calculation time remaining:</span>
                    <span className="text-[#F5F5F7] font-bold text-sm">{estimatedSeconds}s</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 1: Upload Empty State */}
          {completedSteps.length === 0 && (
            <div className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 text-center min-h-[380px]">
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl">
                {/* File Drop bounds */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-full min-h-[280px] p-6 md:p-10 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center ${
                      dragOver 
                        ? 'border-[#D946EF] bg-[#D946EF]/5 shadow-[0_0_20px_rgba(217,70,239,0.15)]' 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5 bg-[#08080F]'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      accept=".zip,.html,.htm,.css,.js"
                      className="hidden"
                    />
                    
                    <div className="w-14 h-14 bg-[#D946EF]/10 rounded-2xl flex items-center justify-center border border-white/5 mb-4">
                      <Upload className="w-7 h-7 text-[#D946EF]" />
                    </div>

                    <h4 className="font-display font-semibold text-[#F5F5F7] text-md md:text-lg">
                      Drag & drop folder, zip, or index HTML files
                    </h4>
                    <p className="mt-2 text-xs text-[#9CA3AF] max-w-xs leading-relaxed">
                      ConFile auto-inlining compiles CSS, JS, and image assets dynamically into 100% compliant Blogger XML in under 2 seconds. Limit 25MB total.
                    </p>

                    <button
                      type="button"
                      className="mt-6 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#D946EF] to-[#EC4899] shadow-md hover:opacity-90 tracking-wide"
                    >
                      Browse Static Files
                    </button>
                  </div>
                </div>

                {/* Compatibility Checklist */}
                <div className="lg:col-span-5 bg-[#07070F] border border-white/5 rounded-2xl p-6 flex flex-col justify-start text-left">
                  <div className="flex items-center space-x-2 pb-3.5 border-b border-white/5 mb-4">
                    <Sparkles className="w-4 h-4 text-[#D946EF]" />
                    <span className="font-display font-semibold text-xs text-[#F5F5F7] uppercase tracking-wider">
                      Static Compiler Capabilities
                    </span>
                  </div>

                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed mb-4">
                    ConFile scans HTML frameworks, bundles externalized stylesheets files, and automatically builds compliant XML ready of Blogger layouts settings.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-[#10B981] uppercase tracking-wider block mb-1.5 font-mono">
                        Included asset bindings
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#F5F5F7]">
                        <div className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center justify-between">
                          <span>HTML Files</span>
                          <span className="text-[#10B981]">✓</span>
                        </div>
                        <div className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center justify-between">
                          <span>CSS stylesheets</span>
                          <span className="text-[#10B981]">✓</span>
                        </div>
                        <div className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center justify-between font-mono">
                          <span>Javascript</span>
                          <span className="text-[#10B981]">✓</span>
                        </div>
                        <div className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center justify-between">
                          <span>Images (Base64)</span>
                          <span className="text-[#10B981]">✓</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider block mb-1.5 font-mono">
                        Blogger Schema Requirements
                      </span>
                      <ul className="text-[10px] text-[#9CA3AF] space-y-1.5 leading-relaxed list-disc list-inside">
                        <li>Strict XHTML template tags enclosing</li>
                        <li>No external local references or links</li>
                        <li>Protected CDATA layout skin variables</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {errorText && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-[#F87171] text-xs max-w-lg flex items-center space-x-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}
            </div>
          )}

          {/* Business plan Custom XML theme generator widget bar */}
          {completedSteps.length > 0 && currentPlan === 'business' && (
            <div className="absolute top-0 inset-x-0 z-30 bg-[#0F0F1A] border-b border-purple-500/30 px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-2 text-[#D946EF]">
                <Sparkle className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  Custom Blogger Generative XML Workspace
                </span>
              </div>
              <div className="flex-grow max-w-xl flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Add a beautiful floating review carousel, a responsive navigation footer, or styles changes..."
                  value={componentPrompt}
                  onChange={(e) => setComponentPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomThemeElement()}
                  className="flex-grow bg-white/5 text-xs text-white px-3.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#D946EF] font-mono"
                  disabled={isGeneratingComponent}
                />
                <button
                  onClick={handleGenerateCustomThemeElement}
                  className="bg-[#D946EF] hover:bg-[#D946EF]/80 text-white text-[11px] font-mono px-4 py-1.5 rounded-lg font-bold flex items-center space-x-1 uppercase"
                  disabled={isGeneratingComponent}
                >
                  {isGeneratingComponent ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Generate Component</span>
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Workspace Editor & Render View split */}
          {completedSteps.length > 0 && (
            <div className={`flex-grow flex flex-col lg:flex-row w-full ${currentPlan === 'business' ? 'pt-12' : ''}`}>
              
              {/* Left Column: Compilation Outputs Editor Tabular controls */}
              <div className="w-full lg:w-1/2 border-r border-white/5 flex flex-col bg-[#07070B] p-6 justify-between min-h-[480px]">
                <div className="flex flex-col flex-grow">
                  
                  {/* File selection headers */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-4 h-4 text-[#D946EF]" />
                      <span className="text-xs font-semibold uppercase text-[#9CA3AF] tracking-wider font-mono">
                        Workspace Source Sandbox
                      </span>
                    </div>

                    <div className="text-[10px] text-[#9CA3AF] bg-white/5 px-2.5 py-1 rounded border border-white/5 font-mono">
                      {fileDetails.filter(f => f.type !== 'other').length} components Compiled
                    </div>
                  </div>

                  {/* File tabs toggles */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-white/5">
                    {fileDetails.filter(f => f.type !== 'other').map(file => (
                      <button
                        key={file.name}
                        onClick={() => setActiveTab(file.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                          activeTab === file.name
                            ? 'border-[#D946EF]/50 bg-[#D946EF]/15 text-[#D946EF]'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 text-[#9CA3AF]'
                        }`}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>

                  {/* Code editor visualization pane (User can view/copy dynamic sources) */}
                  <div className="mt-4 flex-grow bg-[#040406] border border-white/5 rounded-xl p-4 overflow-y-auto max-h-[360px] relative shadow-inner min-h-[320px]">
                    {loadingStep ? (
                      <SkeletonLoader />
                    ) : (
                      fileDetails.map(file => {
                        if (file.name !== activeTab) return null;
                        return (
                          <pre key={file.name} className="font-mono text-xs text-[#9CA3AF] whitespace-pre-wrap select-text leading-relaxed">
                            <code>{file.content}</code>
                          </pre>
                        );
                      })
                    )}
                  </div>

                  {/* Excluded assets list flags */}
                  {flaggedFiles.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <span className="text-[10px] font-bold text-yellow-400 font-mono block mb-1">
                        Skipped Asset Adjustments:
                      </span>
                      <div className="space-y-1 font-mono text-[9px] text-[#9CA3AF]">
                        {flaggedFiles.slice(0, 3).map((f, i) => (
                          <div key={i}>• {f.name} ({f.reason})</div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Direct compilation report view for premium tiers */}
                {analysis && (currentPlan === 'pro' || currentPlan === 'business') && (
                  <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/5 space-y-3">
                    <div className="flex items-center space-x-1.5">
                      <Brain className="w-4 h-4 text-[#D946EF]" />
                      <span className="text-xs font-semibold text-[#F5F5F7] font-sans">
                        Deep Structure Analysis Report
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-[#9CA3AF]">
                      <div>
                        <span className="block text-white/50 mb-1">Parsed HTML Tags:</span>
                        <div className="bg-black/50 p-2 rounded max-h-[90px] overflow-y-auto">
                          {analysis.structure?.map((st, sidx) => (
                            <div key={sidx} className="mb-1">
                              <strong>{st.htmlFile}:</strong>
                              <div className="pl-2">
                                {Object.entries(st.tagsCount || {}).slice(0,6).map(([tag, count]) => (
                                  <div key={tag}>{tag}: {count}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="block text-white/50 mb-1">CSS Selectors Detected:</span>
                        <div className="bg-black/50 p-2 rounded max-h-[90px] overflow-y-auto">
                          {analysis.selectors?.map((st, sidx) => (
                            <div key={sidx} className="mb-1 leading-relaxed">
                              <strong>{st.cssFile}:</strong> {st.selectorsCount} CSS rules.
                              <div className="pl-1 text-[8px] text-[#9CA3AF]">
                                {st.sampleSelectors?.slice(0,3).join(', ')}...
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic XML Output Editor Workspace */}
              <div className="w-full lg:w-1/2 p-6 flex flex-col bg-[#030305] min-h-[480px] justify-between">
                <div className="flex flex-col flex-grow">
                  
                  {/* Blogger title headers and Download trigger */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="text-[#D946EF] w-4 h-4" />
                      <span className="text-xs font-semibold uppercase text-[#9CA3AF] tracking-wider font-mono">
                        Blogger XML Output
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <button
                        onClick={handleDownloadXml}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-3 py-1 rounded border border-emerald-500/20 flex items-center space-x-1.5 uppercase transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Blogger XML</span>
                      </button>

                      {draftXml && (
                        <div id="xml-preflight-debug-display" className="text-[9px] font-mono text-white/40 text-right mt-1.5 select-none leading-none">
                          <span>Size: <strong className="text-emerald-500/70">{(new Blob([draftXml.replace(/^\uFEFF/, '').trimStart()]).size).toLocaleString()} B</strong> | Starts: <code className="bg-white/5 px-1.5 py-0.5 rounded text-emerald-400/90 font-bold">"{
                            draftXml.replace(/^\uFEFF/, '').trimStart().slice(0, 10).split('').map((c: string) => {
                              if (c === '\n') return '\\n';
                              if (c === '\r') return '\\r';
                              if (c === '\t') return '\\t';
                              if (c.charCodeAt(0) < 32) return `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`;
                              return c;
                            }).join('')
                          }"</code></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Warning banner blocked upon failed Blogger compliance validation */}
                  {downloadErrors.length > 0 && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/25 rounded-md p-3.5 text-xs text-[#F87171] leading-relaxed">
                      <div className="flex items-center space-x-2 mb-2 font-bold text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>Blogger structural checks failed! Download blocked.</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-red-300/90 font-mono text-[10px]">
                        {downloadErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                      <button 
                        onClick={() => setDownloadErrors([])}
                        className="mt-2.5 text-[10px] hover:underline text-[#D946EF] font-mono"
                      >
                        Dismiss errors
                      </button>
                    </div>
                  )}

                  {/* Main XML Code representation wrapper */}
                  <div className="flex-grow flex flex-col bg-[#050508] border border-white/5 rounded-xl p-4 relative justify-between min-h-[320px]">
                    <div className="absolute top-2 right-2 flex items-center space-x-1 text-[9px] font-mono bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded border border-emerald-500/10 z-10 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                      <span>{isGeneratingComponent ? 'AI Building...' : loadingStep ? 'Compiling Live...' : 'Compliant XML Active'}</span>
                    </div>

                    {isGeneratingComponent || loadingStep ? (
                      <div className="flex-grow flex flex-col justify-center">
                        <SkeletonLoader />
                      </div>
                    ) : (
                      <textarea
                        value={draftXml}
                        onChange={(e) => {
                          setDraftXml(e.target.value);
                          setDownloadErrors([]); // Clear old download warnings on modification
                          runBloggerXMLValidation(sessionId || 'simulated', e.target.value);
                        }}
                        className="w-full h-[320px] bg-[#020204] border border-white/5 text-xs text-white p-3 rounded-lg font-mono focus:outline-none focus:border-[#D946EF] resize-none leading-relaxed select-text flex-grow"
                        spellCheck="false"
                      />
                    )}

                    {/* Detailed Validation Error Log Panel */}
                    {xmlErrors.length > 0 && (
                      <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 font-mono">
                        <div className="flex items-center space-x-1.5 mb-1.5 font-semibold text-red-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                          <span>Blogger Theme Validation Errors ({xmlErrors.length})</span>
                        </div>
                        <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          {xmlErrors.map((err, i) => (
                            <div key={i} className="flex items-start space-x-1.5 text-[10px] leading-relaxed border-t border-red-500/5 pt-1.5 first:border-0 first:pt-0">
                              <span className="bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0">Line {err.line}</span>
                              <span className="text-red-300/90 whitespace-pre-wrap">{err.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom active schema metadata tracking */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          validationStatus === 'valid' ? 'bg-[#10B981]' : 'bg-red-500'
                        }`} />
                        <span className="text-[10px] font-mono text-[#9CA3AF]">
                          Blogger Schema status: <strong className={validationStatus === 'valid' ? 'text-[#10B981]' : 'text-red-400'}>{validationStatus.toUpperCase()}</strong>
                        </span>
                      </div>
                      {xmlErrors.length > 0 && (
                        <span className="text-[9px] text-[#EF4444] font-mono leading-tight truncate max-w-[280px]" title={xmlErrors[0].message}>
                          Validation Failed: {xmlErrors.length} Issue{xmlErrors.length > 1 ? 's' : ''} detected
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* FULL-SCREEN PREVIEW OVERLAY */}
      {completedSteps.length > 0 && (
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 w-screen h-screen z-[9999] bg-[#0A0A15]/95 backdrop-blur-md flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#121222] px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-[#D946EF]" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Live Preview Sandbox
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Responsive resolution bounds selectors */}
                  <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex items-center space-x-2">
                    <button 
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
                        previewDevice === 'desktop' ? 'bg-[#D946EF] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'
                      }`}
                      title="Desktop responsive resolution template render"
                    >
                      <Laptop className="w-4 h-4" />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button 
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
                        previewDevice === 'mobile' ? 'bg-[#D946EF] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'
                      }`}
                      title="Mobile responsive resolution view"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setIsPreviewOpen(false)}
                    className="text-[#9CA3AF] hover:text-white transition-colors p-2 text-lg font-bold"
                    title="Close preview"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Sandbox iframe render representation page */}
              <div className="flex-grow p-4 md:p-8 bg-[#08080C] overflow-hidden flex justify-center items-center">
                <div className={`bg-white rounded-xl overflow-hidden relative shadow-2xl border border-white/10 transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-full max-w-[390px] h-[92%] max-h-[800px]' : 'w-full h-full'
                }`}>
                  <iframe
                    srcDoc={getLivePreviewSrcDoc()}
                    title="Floating Live Sandbox Render"
                    className="w-full h-full border-none bg-white text-black"
                    sandbox="allow-scripts"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* FLOATING TRIGGER: PREVIEW BUTTON (Always visible in bottom-left viewport corner) */}
      {completedSteps.length > 0 && (
        <div className="fixed bottom-6 left-6 z-[9990] flex flex-col items-start font-sans">
          <button
            onClick={() => {
              const nextState = !isPreviewOpen;
              setIsPreviewOpen(nextState);
              if (nextState) setIsChatOpen(false);
            }}
            className="w-14 h-14 bg-gradient-to-tr from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#10B981] text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all outline-none relative hover:scale-105"
            title="Open Live Preview"
            id="floating-preview-trigger"
          >
            {isPreviewOpen ? (
              <span className="text-lg font-semibold font-mono">✕</span>
            ) : (
              <>
                <Eye className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* FULL-SCREEN AI CHAT OVERLAY */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 w-screen h-screen z-[9999] bg-[#0A0A15]/95 backdrop-blur-md flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#121222] px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <MessageSquare className="w-5 h-5 text-[#D946EF]" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                </div>
                <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  ConFile AI Developer
                </span>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-[#9CA3AF] hover:text-white transition-colors p-2 text-lg font-bold"
                title="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Chat content chat-flows list */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-4 scroll-smooth">
              <div className="max-w-3xl mx-auto space-y-4">
                {chatHistory.map((ch, idx) => (
                  <div 
                    key={idx} 
                    className={`flex w-full ${ch.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`w-auto max-w-[90%] md:max-w-[85%] p-4 rounded-2xl shadow-lg flex flex-col overflow-hidden text-left ${
                        ch.sender === 'user' 
                          ? 'bg-[#1F122B] border border-[#D946EF]/25 text-white ml-auto' 
                          : 'bg-[#111122]/90 text-white border border-white/5 mr-auto'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-white/50 mb-2 uppercase font-mono tracking-wider shrink-0">
                        {ch.sender === 'user' ? (
                          <span className="text-[#E9D5FF]">You</span>
                        ) : (
                          <span className="text-[#D946EF] flex items-center gap-1">
                            <Sparkle className="w-3 h-3 text-[#D946EF] animate-pulse" />
                            <span>ConFile AI Assistant</span>
                          </span>
                        )}
                      </div>
                      <div className="text-white w-full overflow-hidden break-words">
                        {renderChatMessageText(ch.text, ch.sender)}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[#9CA3AF] italic flex items-center space-x-2 mr-auto max-w-[85%] font-mono">
                    <Loader className="w-4 h-4 animate-spin text-[#D946EF]" />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chat footer text input form */}
            <div className="p-4 md:p-6 bg-[#07070F] border-t border-white/10 shrink-0">
              <form onSubmit={handleSendChatMessage} className="max-w-3xl mx-auto flex gap-3">
                <input
                  type="text"
                  placeholder={
                    currentPlan === 'pro' || currentPlan === 'business'
                      ? "Ask Blogger or script structural tips..."
                      : "Upgrade to talk with our AI coding buddy"
                  }
                  disabled={currentPlan !== 'pro' && currentPlan !== 'business'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-grow bg-[#121222] text-xs md:text-sm text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#D946EF] font-mono placeholder:text-gray-500 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={currentPlan !== 'pro' && currentPlan !== 'business'}
                  className="bg-[#D946EF] hover:bg-[#D946EF]/80 disabled:opacity-40 text-white px-5 py-3 rounded-xl transition-all flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TRIGGER: CIRCULAR AI LAUNCHER (Always visible in bottom-right viewport corner) */}
      <div className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end">
        <button
          onClick={() => {
            const nextState = !isChatOpen;
            setIsChatOpen(nextState);
            if (nextState) setIsPreviewOpen(false);
          }}
          className="w-14 h-14 bg-gradient-to-tr from-[#D946EF] to-[#EC4899] hover:from-[#EC4899] hover:to-[#D946EF] text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95 transition-all outline-none hover:scale-105"
          title="Open ConFile AI Chat"
          id="floating-chat-trigger"
        >
          {isChatOpen ? (
            <span className="text-lg font-semibold font-mono">✕</span>
          ) : (
            <MessageSquare className="w-6 h-6" />
          )}
        </button>
      </div>

    </section>
  );
}
