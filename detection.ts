import { FlaggedFile, FileEntry } from '../types/index';

export function detectUnsupportedFiles(files: { name: string; size: number; content: string }[]): {
  supported: FileEntry[];
  flagged: FlaggedFile[];
} {
  const supported: FileEntry[] = [];
  const flagged: FlaggedFile[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();
    const content = file.content;

    // Check by file extension or specific name
    if (name.endsWith('.php')) {
      flagged.push({
        name: file.name,
        reason: `${file.name} is a PHP server-side script. Blogger cannot run PHP files—only client-side static assets are supported.`
      });
      continue;
    }

    if (name.endsWith('.py')) {
      flagged.push({
        name: file.name,
        reason: `${file.name} is a Python script. Blogger is written on Google's hosting infrastructure and cannot run Python backend files.`
      });
      continue;
    }

    if (name.endsWith('.rb')) {
      flagged.push({
        name: file.name,
        reason: `${file.name} is a Ruby script. Blogger only hosts client-side HTML, CSS, and JS styles on its theme servers.`
      });
      continue;
    }

    if (name.includes('.env')) {
      flagged.push({
        name: file.name,
        reason: `${file.name} contains environment key-value secrets. Exposing secrets on a public Blogger blog is dangerous and forbidden.`
      });
      continue;
    }

    if (name === 'dockerfile' || name === 'docker-compose.yml') {
      flagged.push({
        name: file.name,
        reason: `Docker configurations are used to orchestrate server containers. Blogger does not provide container or Docker execution.`
      });
      continue;
    }

    if (name === 'package.json') {
      // Check for server-side framework declarations in package.json
      if (content.includes('"express"') || content.includes('"koa"') || content.includes('"nest"') || content.includes('"fastify"')) {
        flagged.push({
          name: file.name,
          reason: `Your package.json specifies a backend Framework (Express/Koa/Nest/Fastify), which requires a persistent Node.js server. Blogger is static-only.`
        });
        continue;
      }
    }

    if (name === 'next.config.js' || name === 'next.config.mjs') {
      flagged.push({
        name: file.name,
        reason: `${file.name} is a Next.js server config. Blogger only operates as a single static index, not a Next.js server.`
      });
      continue;
    }

    // Check for API path folders or server folders in path
    if (name.includes('/api/') || name.startsWith('api/') || name.includes('/server/') || name.startsWith('server/')) {
      flagged.push({
        name: file.name,
        reason: `The path of '${file.name}' suggests it is part of an /api/ or /server/ backend. Blogger has zero backend database or server runtime capability.`
      });
      continue;
    }

    // Determine type based on extension
    let type: 'html' | 'css' | 'js' | 'other' = 'other';
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      type = 'html';
    } else if (name.endsWith('.css')) {
      type = 'css';
    } else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.mjs')) {
      type = 'js';
    }

    if (type === 'other') {
      // If it's a common static asset (like images under 5MB, font, json), keep it as other so step 4 can link or embed
      const isAsset = /\.(png|jpe?g|gif|svg|webp|json|ico)$/i.test(name);
      if (isAsset) {
        supported.push({
          name: file.name,
          content: file.content,
          type: 'other',
          size: file.size
        });
      } else {
        flagged.push({
          name: file.name,
          reason: `The file type of ${file.name} is not a valid Blogger building block (only HTML, CSS, JS, and common static images/JSON are allowed).`
        });
      }
    } else {
      supported.push({
        name: file.name,
        content: file.content,
        type,
        size: file.size
      });
    }
  }

  return { supported, flagged };
}
