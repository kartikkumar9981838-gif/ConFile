export interface FileEntry {
  name: string;
  content: string;
  type: 'html' | 'css' | 'js' | 'other';
  size: number;
}

export interface FlaggedFile {
  name: string;
  reason: string;
}

export interface AnalysisResult {
  structure: {
    htmlFile: string;
    tagsCount: Record<string, number>;
    ids: string[];
    classes: string[];
  }[];
  selectors: {
    cssFile: string;
    selectorsCount: number;
    rulesCount: number;
    sampleSelectors: string[];
  }[];
  jsIssues: {
    file: string;
    line: number;
    message: string;
    code: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  unsupported: FlaggedFile[];
  success: boolean;
}

export interface OptimizeIssue {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestedFix: string;
  accepted?: boolean;
}

export interface HealthReport {
  healthScore: number;
  summary: string;
  issues: OptimizeIssue[];
  unsupported: string[];
}

export interface ValidationError {
  line: number;
  message: string;
}

export interface ConversionSession {
  sessionId: string;
  files: FileEntry[];
  flagged: FlaggedFile[];
  analysis?: AnalysisResult;
  draftXml?: string;
  healthReport?: HealthReport;
  validation?: {
    valid: boolean;
    errors: ValidationError[];
  };
}
