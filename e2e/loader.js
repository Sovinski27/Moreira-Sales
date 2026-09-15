/**
 * Custom Node.js Module Customization Hooks
 * Resolves directory imports and provides import.meta.env polyfill.
 */

import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.__IMPORT_META_ENV__ = {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  MODE: 'test',
  DEV: true,
  PROD: false,
};

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const parentDir = context.parentURL ? fileURLToPath(context.parentURL) : '';
      const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '/index.js'];
      for (const ext of extensions) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!result.source) return result;

  let content = typeof result.source === 'string'
    ? result.source
    : Buffer.from(result.source).toString('utf-8');

  if (content.includes('import.meta.env')) {
    content = content.replaceAll('import.meta.env', '(globalThis.__IMPORT_META_ENV__ || {})');
    return {
      ...result,
      format: result.format,
      source: content,
    };
  }

  return result;
}
