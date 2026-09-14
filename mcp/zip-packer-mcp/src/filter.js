import path from 'node:path';
import picomatch from 'picomatch';

/**
 * Convert any path to a standard POSIX relative path.
 * e.g. "foo\\bar\\baz.txt" -> "foo/bar/baz.txt"
 */
export function toPosix(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

/**
 * Expand a pattern into picomatch-compatible patterns.
 * e.g. "node_modules" -> ["node_modules", "node_modules/**"]
 *      "dist/" -> ["dist/**"]
 *      "./src/**" -> ["src/**"]
 */
export function expandPattern(pattern) {
  if (!pattern || typeof pattern !== 'string') return [];
  let p = pattern.trim().replace(/\\/g, '/');
  
  // Remove leading ./
  p = p.replace(/^\.\//, '');
  if (!p) return [];

  // Direct directory or file name without slash (e.g. "node_modules", "dist", ".git", "*.log")
  if (!p.includes('/')) {
    const hasGlob = /[*?[\]{}()]/.test(p);
    if (!hasGlob) {
      return [
        p,
        `${p}/**`,
        `**/${p}`,
        `**/${p}/**`
      ];
    } else {
      return [
        p,
        `**/${p}`
      ];
    }
  }

  // If pattern ends with /**
  if (p.endsWith('/**')) {
    const base = p.slice(0, -3);
    if (!base.includes('/')) {
      return [p, base, `**/${p}`, `**/${base}`, `**/${base}/**`];
    }
    return [p, base, `**/${p}`, `**/${base}`];
  }

  // If pattern ends with /*
  if (p.endsWith('/*')) {
    const base = p.slice(0, -2);
    if (!base.includes('/')) {
      return [p, base, `${base}/**`, `**/${p}`, `**/${base}`, `**/${base}/**`];
    }
    return [p, base, `**/${p}`, `**/${base}`];
  }

  // If ends with /, e.g. "dist/"
  if (p.endsWith('/')) {
    const base = p.slice(0, -1);
    if (!base.includes('/')) {
      return [base, `${base}/**`, `**/${base}`, `**/${base}/**`];
    }
    return [base, `${base}/**`, `**/${base}`, `**/${base}/**`];
  }

  // If it starts with **/
  if (p.startsWith('**/')) {
    return [p, `${p}/**`];
  }

  return [p, `${p}/**`, `**/${p}`, `**/${p}/**`];
}

/**
 * Expand a list of pattern strings.
 */
export function expandPatterns(patterns) {
  if (!patterns || !Array.isArray(patterns)) return [];
  const result = [];
  for (const pat of patterns) {
    result.push(...expandPattern(pat));
  }
  return result;
}

/**
 * Creates a fast directory pruner.
 * Returns true if a directory should be skipped completely during recursive traversal.
 * Guarantees that excluded directories (like node_modules, .git) are immediately skipped
 * without reading or descending into their subdirectories.
 */
export function createDirectoryPruner(excludes = []) {
  if (!excludes || !Array.isArray(excludes) || excludes.length === 0) {
    return () => false;
  }
  const excPatterns = expandPatterns(excludes);
  const isExcluded = picomatch(excPatterns, { dot: true });

  // Extract simple direct directory names from excludes for O(1) instant rejection
  // e.g. 'node_modules', '.git', 'dist', 'node_modules/**', '**/node_modules/**'
  const directExcludedNames = new Set();
  for (const raw of excludes) {
    if (!raw || typeof raw !== 'string') continue;
    let clean = raw.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
    clean = clean.replace(/^\*\*\//, '').replace(/\/\*\*$/, '').replace(/\/\*$/, '');
    if (clean && !/[*?[\]{}()/]/.test(clean)) {
      directExcludedNames.add(clean);
    }
  }

  return function shouldPruneDirectory(arg1, arg2) {
    let dirName;
    let relPosix;
    if (arg2 !== undefined) {
      dirName = arg1;
      relPosix = arg2;
    } else {
      relPosix = arg1;
      dirName = relPosix ? relPosix.split('/').pop() : '';
    }

    // 1. Instant check on directory name (e.g. dirName is 'node_modules')
    if (dirName && directExcludedNames.has(dirName)) {
      return true;
    }

    // 2. Check if any path segment matches direct names
    if (relPosix) {
      const segments = relPosix.split('/');
      if (segments.some(seg => directExcludedNames.has(seg))) {
        return true;
      }

      // 3. Glob match against posix path
      if (
        isExcluded(relPosix) ||
        isExcluded(`${relPosix}/`) ||
        isExcluded(`${relPosix}/__child__`)
      ) {
        return true;
      }
    }

    return false;
  };
}

/**
 * Filter a list of scanned relative files according to includes and excludes rules.
 * 
 * Rules:
 * 1. Self-exclusion guard (if target zip is within source directory, unconditionally exclude it).
 * 2. If `includes` is specified, retain only files matching at least one include pattern.
 *    If `includes` is empty or not provided, all files are included by default.
 * 3. If `excludes` is specified, drop all files matching any exclude pattern from the included set.
 * 
 * @param {Array<{ relativePath: string, fullPath: string, size: number }>} files
 * @param {Object} options
 * @param {string[]} [options.includes]
 * @param {string[]} [options.excludes]
 * @param {string} [options.selfExcludeRelativePath]
 * @returns {{ selectedFiles: Array, excludedFiles: Array }}
 */
export function filterFileList(files, { includes = [], excludes = [], selfExcludeRelativePath = null } = {}) {
  const selfExcludePosix = selfExcludeRelativePath ? toPosix(selfExcludeRelativePath) : null;

  // 1. Prepare include matcher
  const incPatterns = expandPatterns(includes);
  const hasIncludeFilter = incPatterns.length > 0;
  const isIncluded = hasIncludeFilter 
    ? picomatch(incPatterns, { dot: true }) 
    : () => true;

  // 2. Prepare exclude matcher
  const excPatterns = expandPatterns(excludes);
  const hasExcludeFilter = excPatterns.length > 0;
  const isExcluded = hasExcludeFilter 
    ? picomatch(excPatterns, { dot: true }) 
    : () => false;

  const selectedFiles = [];
  const excludedFiles = [];

  for (const file of files) {
    const relPosix = toPosix(file.relativePath);

    // Self-exclusion guard
    if (selfExcludePosix && relPosix === selfExcludePosix) {
      excludedFiles.push({ ...file, reason: 'self-exclusion guard' });
      continue;
    }

    // Step 1: Check Include
    if (!isIncluded(relPosix)) {
      excludedFiles.push({ ...file, reason: 'not in includes' });
      continue;
    }

    // Step 2: Check Exclude (evaluated on included files)
    if (isExcluded(relPosix)) {
      excludedFiles.push({ ...file, reason: 'matched excludes' });
      continue;
    }

    selectedFiles.push(file);
  }

  return { selectedFiles, excludedFiles };
}
