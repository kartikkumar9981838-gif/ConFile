import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import * as acorn from 'acorn';
import { AnalysisResult, FileEntry, FlaggedFile } from '../types/index';

export function runFullAnalysis(
  files: FileEntry[],
  unsupported: FlaggedFile[]
): AnalysisResult {
  const structure: AnalysisResult['structure'] = [];
  const selectors: AnalysisResult['selectors'] = [];
  const jsIssues: AnalysisResult['jsIssues'] = [];

  for (const file of files) {
    try {
      if (file.type === 'html') {
        const isTooLarge = (file.size && file.size > 500 * 1024) || file.content.length > 500 * 1024;
        if (isTooLarge) {
          const fileSizeKb = Math.round((file.size || file.content.length) / 1024);
          structure.push({
            htmlFile: file.name,
            tagsCount: {
              [`Large file (${fileSizeKb}KB) - skipped deep DOM analysis`]: 1
            },
            ids: [],
            classes: []
          });
          continue;
        }

        const dom = new JSDOM(file.content);
        const doc = dom.window.document;
        const allElements = Array.from(doc.querySelectorAll('*'));
        
        const tagsCount: Record<string, number> = {};
        const idsSet = new Set<string>();
        const classesSet = new Set<string>();

        for (const el of allElements) {
          const tagName = el.tagName.toLowerCase();
          tagsCount[tagName] = (tagsCount[tagName] || 0) + 1;

          if (el.id) {
            idsSet.add(el.id);
          }

          const className = el.getAttribute('class');
          if (className) {
            className.split(/\s+/).filter(Boolean).forEach(cls => classesSet.add(cls));
          }
        }

        structure.push({
          htmlFile: file.name,
          tagsCount,
          ids: Array.from(idsSet).slice(0, 50), // Cap for display
          classes: Array.from(classesSet).slice(0, 100) // Cap for display
        });
      }

      else if (file.type === 'css') {
        let rulesCount = 0;
        let selectorsCount = 0;
        const sampleSelectorsSet = new Set<string>();

        try {
          const root = postcss.parse(file.content);
          root.walkRules(rule => {
            rulesCount++;
            selectorsCount += rule.selectors.length;
            rule.selectors.forEach(sel => {
              if (sampleSelectorsSet.size < 30) {
                sampleSelectorsSet.add(sel);
              }
            });
          });
        } catch (cssErr) {
          // Robust regex fallback helper for CSS
          const matches = file.content.match(/([^{]+)\s*\{/g) || [];
          rulesCount = matches.length;
          matches.slice(0, 30).forEach(m => {
            const clean = m.replace('{', '').trim();
            if (clean && !clean.includes('@') && sampleSelectorsSet.size < 30) {
              sampleSelectorsSet.add(clean);
            }
          });
          selectorsCount = rulesCount; // estimate fallback
        }

        selectors.push({
          cssFile: file.name,
          rulesCount,
          selectorsCount,
          sampleSelectors: Array.from(sampleSelectorsSet)
        });
      }

      else if (file.type === 'js') {
        const lines = file.content.split('\n');
        const isVendorOrMinified = 
          /jquery|bootstrap/i.test(file.name) || 
          file.name.toLowerCase().endsWith('.min.js') || 
          (file.size && file.size > 150 * 1024) || 
          (file.content.length > 150 * 1024) ||
          lines.some(line => line.length > 3000);

        if (isVendorOrMinified) {
          jsIssues.push({
            file: file.name,
            line: 1,
            message: "Vendor/minified file - skipped detailed analysis for performance",
            code: "",
            severity: 'info'
          });
          continue;
        }

        // Line-by-line scanning is much safer and more pinpoint correct for node APIs
        
        // Let's also try to parse with acorn for integrity, but check lines manually
        let hasSyntaxError = false;
        try {
          acorn.parse(file.content, { ecmaVersion: 2022, sourceType: 'module' });
        } catch (acErr: any) {
          hasSyntaxError = true;
          // Syntax errors are logged as warnings too but won't block conversion
          jsIssues.push({
            file: file.name,
            line: acErr.loc?.line || 1,
            message: `Acorn JS Syntax notice: ${acErr.message}. The files can still be converted, but review modern syntax/ESNext usage.`,
            code: lines[(acErr.loc?.line || 1) - 1] || 'CSS/JS line unavailable',
            severity: 'info'
          });
        }

        // Search lines for Node APIs specifically
        lines.forEach((lineText, idx) => {
          const lineNum = idx + 1;
          const trimmed = lineText.trim();

          // Reject/Flag process.env
          if (trimmed.includes('process.env')) {
            jsIssues.push({
              file: file.name,
              line: lineNum,
              message: `Usage of 'process.env' is typical of a backend or build environment. On Blogger, 'process.env' is undefined. Use client-side configurations.`,
              code: trimmed,
              severity: 'error'
            });
          }

          // Reject/Flag fs module
          if (trimmed.includes('require(\'fs\')') || trimmed.includes('require("fs")') || trimmed.includes('from \'fs\'') || trimmed.includes('from "fs"') || trimmed.includes('fs.readFile') || trimmed.includes('fs.writeFile')) {
            jsIssues.push({
              file: file.name,
              line: lineNum,
              message: `Usage of Node filesystem API ('fs'). Blogger operates as a compiled client, totally unable to access server file systems.`,
              code: trimmed,
              severity: 'error'
            });
          }

          // Check for core node import/require
          if (trimmed.includes('require(') && !trimmed.includes('//') && !trimmed.includes('/*')) {
            jsIssues.push({
              file: file.name,
              line: lineNum,
              message: `CommonJS 'require()' will crash in standard micro-browser context. Wrap in bundles or transform into ESM.`,
              code: trimmed,
              severity: 'warning'
            });
          }

          // Path module or globals
          if (trimmed.includes('__dirname') || trimmed.includes('__filename')) {
            jsIssues.push({
              file: file.name,
              line: lineNum,
              message: `Node global shorthand directories (${trimmed.includes('__dirname') ? '__dirname' : '__filename'}) will hold empty or crash in client browser.`,
              code: trimmed,
              severity: 'error'
            });
          }
        });
      }
    } catch (e: any) {
      console.error(`Error analyzing script/page ${file.name}:`, e);
    }
  }

  return {
    structure,
    selectors,
    jsIssues,
    unsupported,
    success: true
  };
}
