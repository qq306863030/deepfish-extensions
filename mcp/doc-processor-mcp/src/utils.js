import path from 'node:path';
import fs from 'node:fs';

export function ok(data = null) {
  return { success: true, data };
}

export function fail(error, data = null) {
  return { success: false, error: error?.message || String(error), data };
}

export function toPosix(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Format timestamp: YYYYMMDD_HHmmss
 */
export function getTimestamp() {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}_${hh}${mm}${ss}`;
}

/**
 * Determine final output path.
 * Defaults to current working directory (process.cwd()).
 * Appends timestamp if target already exists and overwrite is not specified.
 */
export function resolveTargetOutputPath(inputPath, targetFormat, userOutputPath, overwrite = false) {
  const cwd = process.cwd();
  const ext = targetFormat.startsWith('.') ? targetFormat : `.${targetFormat}`;

  if (userOutputPath && typeof userOutputPath === 'string' && userOutputPath.trim()) {
    let resolved = path.resolve(cwd, userOutputPath.trim());
    
    // If user provided a directory path
    let isDir = false;
    if (userOutputPath.endsWith('/') || userOutputPath.endsWith('\\')) {
      isDir = true;
    } else {
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          isDir = true;
        }
      } catch {
        isDir = !path.extname(resolved);
      }
    }

    if (isDir) {
      const baseName = path.basename(inputPath, path.extname(inputPath));
      resolved = path.join(resolved, `${baseName}${ext}`);
    }

    if (fs.existsSync(resolved) && !overwrite) {
      const base = path.basename(resolved, path.extname(resolved));
      const dir = path.dirname(resolved);
      return path.join(dir, `${base}_${getTimestamp()}${ext}`);
    }
    return resolved;
  }

  // Default: current working directory (process.cwd())
  const baseName = path.basename(inputPath, path.extname(inputPath)) || 'output';
  let finalPath = path.join(cwd, `${baseName}${ext}`);

  if (fs.existsSync(finalPath) && !overwrite) {
    finalPath = path.join(cwd, `${baseName}_${getTimestamp()}${ext}`);
  }

  return finalPath;
}
