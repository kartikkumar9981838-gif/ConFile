import { FileEntry } from '../types/index';
import { JSDOM } from 'jsdom';
import { DOMParser } from 'xmldom';
import { BASE_THEME_XML } from './templates/baseTheme';

// Helper list of boolean HTML attributes that must be properly valued in XML
const BOOLEAN_ATTRIBUTES = new Set([
  'checked', 'disabled', 'readonly', 'required', 'async', 'defer', 'multiple',
  'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'playsinline', 'selected'
]);

// Helper list of HTML void elements
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Scan and replace any local background-image assets with their base64 representation.
 * Handles files matched up to 150KB.
 */
function inlineLocalCssAssets(cssText: string, files: FileEntry[]): string {
  if (!cssText) return '';
  return cssText.replace(/url\s*\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi, (match, quote, urlPath) => {
    // Skip external urls or already inlined ones
    if (urlPath.startsWith('http') || urlPath.startsWith('//') || urlPath.startsWith('data:')) {
      return match;
    }

    // Find the matching base64 asset from user uploads
    const matchingImg = files.find(f => f.type === 'other' && (
      f.name === urlPath ||
      f.name.endsWith('/' + urlPath) ||
      urlPath.endsWith('/' + f.name)
    ));

    if (matchingImg && matchingImg.size < 150 * 1024) { // Up to 150KB for backgrounds
      const extension = matchingImg.name.split('.').pop()?.toLowerCase() || 'png';
      const mime = extension === 'svg' ? 'image/svg+xml' : `image/${extension}`;

      let base64Data = '';
      if (matchingImg.content.startsWith('data:')) {
        base64Data = matchingImg.content.split(',')[1] || '';
      } else {
        base64Data = matchingImg.content;
      }

      return `url(${quote}data:${mime};base64,${base64Data}${quote})`;
    }
    return match;
  });
}

function escapeXmlText(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlAttr(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildBloggerXml(files: FileEntry[]): {
  xml: string;
  inlinedImagesCount: number;
  externalImagesCount: number;
  filesMatchedCount: number;
} {
  // Resolve and get all HTML files.
  // If there are zero HTML files (e.g. a lone .css or .js file was uploaded), synthesise a fallback HTML file
  let htmlFiles = files.filter(f => f.type === 'html');
  if (htmlFiles.length === 0) {
    htmlFiles = [{
      name: 'index.html',
      content: '<!DOCTYPE html><html><head></head><body></body></html>',
      type: 'html',
      size: 54
    }];
  }

  // Seeding Map collections to compile deduplicated unique CSS & JS by content hash
  const uniqueCssMap = new Map<string, { source: string; content: string }>();
  const uniqueJsMap = new Map<string, { source: string; content: string }>();

  function getContentHash(str: string): string {
    const clean = str.trim().replace(/\s+/g, ' ');
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  function addCss(content: string, source: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const hash = getContentHash(trimmed);
    if (!uniqueCssMap.has(hash)) {
      uniqueCssMap.set(hash, { source, content: trimmed });
    }
  }

  function addJs(content: string, source: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const hash = getContentHash(trimmed);
    if (!uniqueJsMap.has(hash)) {
      uniqueJsMap.set(hash, { source, content: trimmed });
    }
  }

  // Seed CSS files first
  const cssFiles = files.filter(f => f.type === 'css');
  for (const cssFile of cssFiles) {
    const inlined = inlineLocalCssAssets(cssFile.content, files);
    addCss(inlined, cssFile.name);
  }

  // Seed JS files
  const jsFiles = files.filter(f => f.type === 'js');
  for (const jsFile of jsFiles) {
    addJs(jsFile.content, jsFile.name);
  }

  // Accumulated variables across files
  let concatenatedPagesHtml = '';
  const externalHeadLinks = new Set<string>();
  const externalScripts = new Set<string>();

  let inlinedImagesCount = 0;
  let externalImagesCount = 0;
  let filesMatchedCount = 0;

  // Custom recursive XML serializer inside closure to retain access to helper dictionaries and inline handlers
  function serializeNodeToXml(node: any): string {
    if (node.nodeType === 3) { // Text node
      return escapeXmlText(node.nodeValue || '');
    }
    if (node.nodeType === 8) { // Comment node
      const commentVal = node.nodeValue || '';
      // XML comments cannot contain double hyphens '--'
      const safeComment = commentVal.replace(/--/g, '__');
      return `<!--${safeComment}-->`;
    }
    if (node.nodeType === 1) { // Element node
      const tagName = node.tagName.toLowerCase();
      
      let attributesString = '';

      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        let name = attr.name;
        let val = attr.value || '';

        const nameLower = name.toLowerCase();
        // Skip any xmlns or xmlns:prefix attribute inside embedded HTML/SVG to avoid nested namespace re-declarations
        if (nameLower === 'xmlns' || nameLower.startsWith('xmlns:')) {
          continue;
        }

        // Rename reserved ID case-insensitively
        if (nameLower === 'id' && val.toLowerCase() === 'navbar') {
          val = 'confile-navbar';
        }

        if (nameLower === 'style') {
          val = inlineLocalCssAssets(val, files);
        }

        if (BOOLEAN_ATTRIBUTES.has(nameLower) && !val) {
          val = name;
        }

        attributesString += ` ${name}="${escapeXmlAttr(val)}"`;
      }

      if (node.childNodes.length === 0) {
        if (VOID_TAGS.has(tagName) || tagName.startsWith('b:') || tagName.startsWith('data:')) {
          return `<${tagName}${attributesString} />`;
        } else {
          return `<${tagName}${attributesString}></${tagName}>`;
        }
      }

      if (tagName === 'script' || tagName === 'style') {
        const innerContent = node.textContent || '';
        const protectedContent = innerContent.includes('<![CDATA[') 
          ? innerContent 
          : `\n//<![CDATA[\n${innerContent}\n//]]>\n`;
        return `<${tagName}${attributesString}>${protectedContent}</${tagName}>`;
      }

      let childrenSerialized = '';
      for (let i = 0; i < node.childNodes.length; i++) {
        childrenSerialized += serializeNodeToXml(node.childNodes[i]);
      }

      return `<${tagName}${attributesString}>${childrenSerialized}</${tagName}>`;
    }
    return '';
  }

  // Iterate over every HTML file
  for (const htmlFile of htmlFiles) {
    const dom = new JSDOM(htmlFile.content);
    const doc = dom.window.document;

    // 1. Collect style tag scripts and delete them to inline into skin CDATA
    const styleTags = Array.from(doc.querySelectorAll('style'));
    styleTags.forEach(style => {
      if (style.textContent) {
        const inlined = inlineLocalCssAssets(style.textContent, files);
        addCss(inlined, `inline style in ${htmlFile.name}`);
      }
      style.remove();
    });

    // 2. Clean/extract script tags
    const scriptTags = Array.from(doc.querySelectorAll('script'));
    scriptTags.forEach(script => {
      const src = script.getAttribute('src');
      if (src) {
        // Look up whether this is a local script in our files
        const matchingJs = files.find(f => f.type === 'js' && (f.name === src || f.name.endsWith('/' + src) || src.endsWith('/' + f.name)));
        if (matchingJs) {
          script.remove();
        } else if (!src.startsWith('http') && !src.startsWith('//')) {
          const comment = doc.createComment(` Local JS script warning: '${src}' was not found in the uploaded assets `);
          script.parentNode?.insertBefore(comment, script);
          script.remove();
        }
      } else {
        if (script.textContent) {
          addJs(script.textContent, `inline script in ${htmlFile.name}`);
        }
        script.remove();
      }
    });

    // 3. Remove relative stylesheet links to keep references clean
    const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    linkTags.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const matchingCss = files.find(f => f.type === 'css' && (f.name === href || f.name.endsWith('/' + href) || href.endsWith('/' + f.name)));
        if (matchingCss) {
          link.remove();
        } else if (!href.startsWith('http') && !href.startsWith('//')) {
          const comment = doc.createComment(` Local stylesheet reference warning: '${href}' not found in upload `);
          link.parentNode?.insertBefore(comment, link);
          link.remove();
        }
      }
    });

    // 4. Gather external CDN and font resources
    const headLinks = Array.from(doc.querySelectorAll('link'));
    headLinks.forEach(link => {
      const rel = link.getAttribute('rel');
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http') || href.startsWith('//') || rel === 'preconnect' || rel === 'dns-prefetch') {
        let attributesString = '';
        for (let i = 0; i < link.attributes.length; i++) {
          const attr = link.attributes[i];
          let name = attr.name;
          let val = attr.value || '';
          if (name.toLowerCase() === 'id' && val.toLowerCase() === 'navbar') {
            val = 'confile-navbar';
          }
          attributesString += ` ${name}="${escapeXmlAttr(val)}"`;
        }
        externalHeadLinks.add(`<link${attributesString} />`);
        link.remove();
      }
    });

    // 5. Extract CDN Javascript scripts
    const headScripts = Array.from(doc.querySelectorAll('script'));
    headScripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && (src.startsWith('http') || src.startsWith('//'))) {
        let attributesString = '';
        for (let i = 0; i < script.attributes.length; i++) {
          const attr = script.attributes[i];
          let name = attr.name;
          let val = attr.value || '';
          if (name.toLowerCase() === 'id' && val.toLowerCase() === 'navbar') {
            val = 'confile-navbar';
          }
          attributesString += ` ${name}="${escapeXmlAttr(val)}"`;
        }
        externalScripts.add(`<script${attributesString}></script>`);
        script.remove();
      }
    });

    // 6. Delete title tags to prevent collision with Blogger title widgets
    const titleTag = doc.querySelector('title');
    if (titleTag) {
      titleTag.remove();
    }

    // 7. Inline images as binary representation (up to 100KB)
    const images = Array.from(doc.querySelectorAll('img'));
    images.forEach(img => {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        const matchingImg = files.find(f => f.type === 'other' && (
          f.name === src || 
          f.name.endsWith('/' + src) || 
          src.endsWith('/' + f.name)
        ));

        if (matchingImg) {
          filesMatchedCount++;
          const limit = 100 * 1024;
          if (matchingImg.size < limit) {
            const extension = matchingImg.name.split('.').pop()?.toLowerCase() || 'png';
            const mime = extension === 'svg' ? 'image/svg+xml' : `image/${extension}`;
            
            let base64Data = '';
            if (matchingImg.content.startsWith('data:')) {
              base64Data = matchingImg.content.split(',')[1] || '';
            } else {
              base64Data = matchingImg.content;
            }
            img.setAttribute('src', `data:${mime};base64,${base64Data}`);
            inlinedImagesCount++;
          } else {
            externalImagesCount++;
            const comment = doc.createComment(` ATTACHMENT EXCEEDS 100KB: '${matchingImg.name}' — Placeholder inserted. `);
            img.parentNode?.insertBefore(comment, img);
            img.setAttribute('alt', `${img.getAttribute('alt') || ''} [External CDN required for: ${matchingImg.name}]`);
          }
        }
      }
    });

    // 8. Serialize and pack HTML body content sequence
    let bodyInlinedHtml = '';
    if (doc.body) {
      const bodyChildren = Array.from(doc.body.childNodes);
      bodyChildren.forEach(child => {
        bodyInlinedHtml += serializeNodeToXml(child);
      });
    }

    // Establish wrapper div attributes for this specific source page and preserve original body styling
    let fileWrapperAttr = `class="confile-page-content" data-source="${escapeXmlAttr(htmlFile.name)}"`;
    if (doc.body) {
      for (let i = 0; i < doc.body.attributes.length; i++) {
        const attr = doc.body.attributes[i];
        let name = attr.name;
        let val = attr.value || '';
        if (name.toLowerCase() === 'id') {
          if (val.toLowerCase() === 'navbar') {
            val = 'confile-navbar';
          }
        }
        if (name.toLowerCase() === 'style') {
          val = inlineLocalCssAssets(val, files);
        }
        fileWrapperAttr += ` ${name}="${escapeXmlAttr(val)}"`;
      }
    }

    concatenatedPagesHtml += `\n\n<!-- Source page: ${htmlFile.name} -->\n<div ${fileWrapperAttr}>\n${bodyInlinedHtml}\n</div>`;
  }

  // 9. Format final compiled unique structures
  const combinedCssList: string[] = [];
  uniqueCssMap.forEach((val) => {
    combinedCssList.push(`/* Deduplicated CSS Source: ${val.source} */\n${val.content}`);
  });
  const combinedCssStr = combinedCssList.join('\n\n');

  const combinedJsList: string[] = [];
  uniqueJsMap.forEach((val) => {
    combinedJsList.push(`// Deduplicated JS Source: ${val.source}\n${val.content}`);
  });
  const combinedJsStr = combinedJsList.join('\n\n');

  const safeCss = combinedCssStr.replace(/\]\]>/g, ']] >');
  const safeJs = combinedJsStr.replace(/\]\]>/g, ']] >');

  // Build self-contained HTML payload to inject inside the HTML1 widget CDATA block
  const headLinksInlined = Array.from(externalHeadLinks).join('\n');
  const scriptsInlined = Array.from(externalScripts).join('\n');
  const customStyle = safeCss ? `<style type="text/css">\n${safeCss}\n</style>` : '';
  const customScript = safeJs ? `<script type="text/javascript">\n${safeJs}\n</script>` : '';

  const userPayload = `
${headLinksInlined}
${scriptsInlined}
${customStyle}
<div id="confile-static-content" class="confile-multipage-container">
  ${concatenatedPagesHtml}
</div>
${customScript}
`.trim();

  // Locate the EXACT substring in the base template: <b:widget-setting name='content'><![CDATA[ ... up to the matching ]]>
  const startMarker = "<b:widget-setting name='content'><![CDATA[";
  const endMarker = "]]></b:widget-setting>";

  const startIndex = BASE_THEME_XML.indexOf(startMarker);
  const endIndex = BASE_THEME_XML.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Could not find content injection points in base theme template.");
  }

  // Before inserting the user's content into this CDATA block, sanitize it by replacing any literal "]]>" sequence inside the user's content with "]] >" (adding a space)
  const sanitizedPayload = userPayload.replace(/\]\]>/g, ']] >');

  // Replace ONLY the text strictly between <![CDATA[ and the matching ]]> — never modify, remove, or duplicate the <![CDATA[ or ]]> markers themselves.
  const partBefore = BASE_THEME_XML.substring(0, startIndex + startMarker.length);
  const partAfter = BASE_THEME_XML.substring(endIndex); // starts with "]]></b:widget-setting>"
  
  const finalXml = partBefore + sanitizedPayload + partAfter;

  // After injection, verify programmatically that the count of <![CDATA[ occurrences still exactly equals the count of ]]> occurrences in the final output,
  // and that they are correctly paired (each CDATA opens before its corresponding close, no overlap).
  const openings: number[] = [];
  const closings: number[] = [];

  let posOpen = finalXml.indexOf('<![CDATA[');
  while (posOpen !== -1) {
    openings.push(posOpen);
    posOpen = finalXml.indexOf('<![CDATA[', posOpen + 1);
  }

  let posClose = finalXml.indexOf(']]>');
  while (posClose !== -1) {
    closings.push(posClose);
    posClose = finalXml.indexOf(']]>', posClose + 1);
  }

  if (openings.length !== closings.length) {
    throw new Error(`CDATA Validation Error: The count of <![CDATA[ occurrences (${openings.length}) does not equal the count of ]]> occurrences (${closings.length}) in the final XML output.`);
  }

  for (let i = 0; i < openings.length; i++) {
    const open = openings[i];
    const close = closings[i];
    if (open > close) {
      throw new Error(`CDATA Validation Error: CDATA close tag at position ${close} occurs before CDATA open tag at position ${open}.`);
    }
    if (i < openings.length - 1 && openings[i + 1] < close) {
      throw new Error(`CDATA Validation Error: Nested CDATA block detected. Second open tag at position ${openings[i + 1]} occurs before close tag at position ${close}.`);
    }
  }

  // Automated self-test to verify output syntax well-formedness
  try {
    const selfTestParser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: (msg) => {
          throw new Error(msg);
        },
        fatalError: (msg) => {
          throw new Error(msg);
        }
      }
    });
    selfTestParser.parseFromString(finalXml, 'text/xml');
  } catch (err: any) {
    throw new Error(`Self-Test XML Parse Failed: ${err.message.replace(/\[\s*xmldom\s*[^\]]*\]/g, '').trim()}`);
  }

  return {
    xml: finalXml,
    inlinedImagesCount,
    externalImagesCount,
    filesMatchedCount
  };
}

/**
 * Shared official Blogger XML validator complying with all 12 official rules
 */
export function validateBloggerTheme(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rule 1 & 2: Parse the full document with a real XML parser.
  let doc: any = null;
  let parseErrorMsg = '';

  try {
    const parser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: (msg) => {
          parseErrorMsg += (parseErrorMsg ? '\n' : '') + msg;
        },
        fatalError: (msg) => {
          parseErrorMsg += (parseErrorMsg ? '\n' : '') + msg;
        }
      }
    });
    doc = parser.parseFromString(xml, 'text/xml');
    
    const parserErrors = doc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      parseErrorMsg = parserErrors[0].textContent || 'Unknown parse error';
    }
  } catch (err: any) {
    parseErrorMsg = err.message;
  }

  if (parseErrorMsg) {
    const isUnclosed = /unclosed|not closed|must terminate|expected closing tag|end tag mismatch|mismatched tag/i.test(parseErrorMsg);
    const lineMatch = parseErrorMsg.match(/line\s+(\d+)/i) || parseErrorMsg.match(/:(\d+):/) || parseErrorMsg.match(/line:(\d+)/i);
    const colMatch = parseErrorMsg.match(/col(umn)?\s+(\d+)/i) || parseErrorMsg.match(/:(\d+)\b/);
    
    const lineStr = lineMatch ? ` at line ${lineMatch[1]}` : '';
    const colStr = colMatch ? `, column ${colMatch[2]}` : '';
    
    let mainMsg = "Your theme could not be parsed as it is not well-formed.";
    if (isUnclosed) {
      mainMsg += " Please make sure all XML elements are closed properly.";
    }
    
    errors.push(`${mainMsg} Parser detail: ${parseErrorMsg.replace(/\[\s*xmldom\s*[^\]]*\]/g, '').trim()}${lineStr}${colStr}`);
    return { valid: false, errors };
  }

  if (doc) {
    try {
      const allElements = doc.getElementsByTagName('*');

      // Rule 3: There should be one and only one skin in the theme
      const skins = [];
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el.tagName === 'b:skin' || el.localName === 'skin') {
          skins.push(el);
        }
      }
      if (skins.length !== 1) {
        errors.push(`There should be one and only one skin in the theme, and we found: ${skins.length}`);
      }

      // Rule 4: We did not find any section in your theme. A theme must have at least one b:section tag.
      const sections = [];
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el.tagName === 'b:section' || el.localName === 'section') {
          sections.push(el);
        }
      }
      if (sections.length === 0) {
        errors.push("We did not find any section in your theme. A theme must have at least one b:section tag.");
      }

      // Rule 5: One of the sections is missing the required id attribute. Every section should have a unique id.
      const sectionIds = new Set<string>();
      let sectionIdErrorAdded = false;
      for (const sec of sections) {
        const id = sec.getAttribute('id');
        if (!id || id.trim() === '') {
          if (!sectionIdErrorAdded) {
            errors.push("One of the sections is missing the required id attribute. Every section should have a unique id.");
            sectionIdErrorAdded = true;
          }
        } else {
          if (sectionIds.has(id)) {
            if (!sectionIdErrorAdded) {
              errors.push(`One of the sections is missing the required id attribute. Every section should have a unique id. Duplicate section ID found: '${id}'.`);
              sectionIdErrorAdded = true;
            }
          }
          sectionIds.add(id);
        }
      }

      // Rule 6: One of the widgets is missing the required id attribute. Every widget should have a unique id.
      const widgets = [];
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el.tagName === 'b:widget' || el.localName === 'widget') {
          widgets.push(el);
        }
      }

      const widgetIds = new Set<string>();
      let widgetIdErrorAdded = false;
      for (const widget of widgets) {
        const id = widget.getAttribute('id');
        if (!id || id.trim() === '') {
          if (!widgetIdErrorAdded) {
            errors.push("One of the widgets is missing the required id attribute. Every widget should have a unique id.");
            widgetIdErrorAdded = true;
          }
        } else {
          if (widgetIds.has(id)) {
            if (!widgetIdErrorAdded) {
              errors.push(`One of the widgets is missing the required id attribute. Every widget should have a unique id. Duplicate widget ID found: '${id}'.`);
              widgetIdErrorAdded = true;
            }
          }
          widgetIds.add(id);
        }
      }

      // Rule 7: The new widget with id has no type. A widget type is required.
      for (const widget of widgets) {
        const id = widget.getAttribute('id') || '';
        const type = widget.getAttribute('type');
        if (!type || type.trim() === '') {
          errors.push(`The new widget with id ${id} has no type. A widget type is required.`);
        }
      }

      // Rule 8: The new widget with id has an invalid type.
      const KNOWN_WIDGET_TYPES = new Set([
        'Header', 'Footer', 'Blog', 'BlogArchive', 'Profile', 'PageList', 'HTML', 'Image', 
        'Text', 'LinkList', 'Label', 'Feed', 'AdSense', 'Attribution', 'Navbar', 
        'SharedBoxList', 'Subscribe', 'Translate', 'VideoBar', 'Follow', 
        'ContactForm', 'Stats', 'PopularPosts', 'FeaturedPost', 'OpenIDPledge',
        'BlogSearch', 'Generic', 'CustomSearch', 'TextList', 'ReportAbuse'
      ]);
      for (const widget of widgets) {
        const id = widget.getAttribute('id') || '';
        const type = widget.getAttribute('type');
        if (type && !KNOWN_WIDGET_TYPES.has(type)) {
          errors.push(`The new widget with id ${id} has an invalid type.`);
        }
      }

      // Rule 9: The widget with id is not within a section. Every widget should be in a section.
      for (const widget of widgets) {
        const id = widget.getAttribute('id') || '';
        const parent = widget.parentNode;
        const isParentSection = parent && (parent.tagName === 'b:section' || parent.localName === 'section');
        if (!isParentSection) {
          errors.push(`The widget with id ${id} is not within a section. Every widget should be in a section.`);
        }
      }

      // Rule 10: Each <b:widget> must contain exactly one <b:includable id='main'> as a direct child
      for (const widget of widgets) {
        const id = widget.getAttribute('id') || '';
        let mainIncludablesCount = 0;
        const childNodes = widget.childNodes;
        for (let j = 0; j < childNodes.length; j++) {
          const child = childNodes[j];
          if (child.nodeType === 1) {
            const isIncludable = child.tagName === 'b:includable' || child.localName === 'includable';
            if (isIncludable && child.getAttribute('id') === 'main') {
              mainIncludablesCount++;
            }
          }
        }
        if (mainIncludablesCount !== 1) {
          errors.push(`widget '${id}' must contain exactly one <b:includable id='main'>.`);
        }
      }

      // Rule 11: No element anywhere may carry a literal xmlns="..." attribute except the root <html> tag
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el !== doc.documentElement) {
          for (let j = 0; j < el.attributes.length; j++) {
            const attr = el.attributes[j];
            const nameLower = attr.name.toLowerCase();
            if (nameLower === 'xmlns' || nameLower.startsWith('xmlns:')) {
              errors.push(`Blogger Rule Error: stray '${attr.name}' namespace attribute found on non-root element <${el.tagName}>. All namespace declarations must only appear on the root <html> tag.`);
            }
          }
        }
      }

      // Rule 12: id='navbar' must not be reused for arbitrary custom content
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const idVal = el.getAttribute('id');
        if (idVal && idVal.toLowerCase() === 'navbar') {
          const isNavbarWidget = (el.tagName === 'b:widget' || el.localName === 'widget') && el.getAttribute('type') === 'Navbar';
          if (!isNavbarWidget) {
            errors.push("Blogger Rule Error: reserved 'navbar' ID is not allowed inside a Blogger template as it causes layout collision unless paired with a genuine type='Navbar' widget.");
          }
        }
      }

    } catch (err: any) {
      errors.push(`Structural elements check exception: ${err.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateBloggerXml(xml: string): { line: number; message: string }[] {
  const result = validateBloggerTheme(xml);
  return result.errors.map(msg => {
    const lineMatch = msg.match(/line\s+(\d+)/i) || msg.match(/:(\d+):/) || msg.match(/line:(\d+)/i);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
    return { line, message: msg };
  });
}
