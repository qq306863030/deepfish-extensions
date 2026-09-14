import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { filterFileList, toPosix, createDirectoryPruner } from './filter.js';

/**
 * Format date to YYYYMMDD_HHmmss
 */
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}_${hh}${mm}${ss}`;
}

/**
 * Recursively scan files in a directory with early pruning of excluded directories.
 * Avoids descending into node_modules, .git, etc. if they match exclude patterns.
 * @param {string} rootDir 
 * @param {Object} [options]
 * @param {string[]} [options.excludes]
 * @param {string} [options.selfExcludeRelativePath]
 * @param {boolean} [options.skipStat]
 * @param {number} [options.maxFiles]
 * @returns {Promise<Array<{ relativePath: string, fullPath: string, size: number }>>}
 */
export async function scanDirectory(rootDir, { excludes = [], selfExcludeRelativePath = null, skipStat = false, maxFiles = Infinity } = {}) {
  const results = [];
  const prunedDirectories = [];
  const visitedRealPaths = new Set();
  const shouldPrune = createDirectoryPruner(excludes);
  const selfExcludePosix = selfExcludeRelativePath ? toPosix(selfExcludeRelativePath) : null;
  let isTruncated = false;

  async function walk(currentDir, relativePrefix = '') {
    if (results.length >= maxFiles) {
      isTruncated = true;
      return;
    }

    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (results.length >= maxFiles) {
        isTruncated = true;
        break;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
      const relPosix = toPosix(relPath);

      // Self-exclusion guard (e.g. target output zip inside source)
      if (selfExcludePosix && relPosix === selfExcludePosix) {
        continue;
      }

      try {
        if (entry.isDirectory()) {
          // Early prune: skip entire directory subtree if it matches excludes!
          if (shouldPrune(entry.name, relPosix)) {
            prunedDirectories.push(relPosix);
            continue;
          }
          await walk(fullPath, relPath);
        } else if (entry.isFile()) {
          if (skipStat) {
            results.push({
              relativePath: relPosix,
              fullPath,
              size: 0
            });
          } else {
            const stat = await fs.promises.stat(fullPath).catch(() => null);
            if (stat) {
              results.push({
                relativePath: relPosix,
                fullPath,
                size: stat.size
              });
            }
          }
        } else if (entry.isSymbolicLink()) {
          const realTarget = await fs.promises.realpath(fullPath).catch(() => null);
          if (!realTarget || visitedRealPaths.has(realTarget)) {
            continue; // Prevent circular symlinks
          }
          visitedRealPaths.add(realTarget);

          const stat = await fs.promises.stat(fullPath).catch(() => null);
          if (stat) {
            if (stat.isDirectory()) {
              if (shouldPrune(entry.name, relPosix)) {
                prunedDirectories.push(relPosix);
                continue;
              }
              await walk(fullPath, relPath);
            } else if (stat.isFile()) {
              results.push({
                relativePath: relPosix,
                fullPath,
                size: skipStat ? 0 : stat.size
              });
            }
          }
        }
      } catch {
        // Ignore unreadable entries
      }
    }
  }

  await walk(rootDir, '');
  results.prunedDirectories = prunedDirectories;
  results.isTruncated = isTruncated;
  return results;
}

/**
 * Determine final output zip path.
 * If user did not supply outputPath:
 *   default to sibling of sourcePath: <sourceDirName>.zip
 *   if exists and overwrite is false: <sourceDirName>_<timestamp>.zip
 */
export async function resolveOutputPath(sourceDir, userOutputPath, overwrite = false) {
  const absSource = path.resolve(sourceDir);
  const sourceName = path.basename(absSource) || 'archive';
  let targetZipPath;

  if (!userOutputPath || typeof userOutputPath !== 'string' || !userOutputPath.trim()) {
    const parentDir = path.dirname(absSource);
    const defaultName = `${sourceName}.zip`;
    const defaultPath = path.join(parentDir, defaultName);

    if (fs.existsSync(defaultPath) && !overwrite) {
      targetZipPath = path.join(parentDir, `${sourceName}_${getTimestamp()}.zip`);
    } else {
      targetZipPath = defaultPath;
    }
  } else {
    let resolved = path.resolve(userOutputPath);
    let isDir = false;

    if (userOutputPath.endsWith('/') || userOutputPath.endsWith('\\')) {
      isDir = true;
    } else {
      try {
        const stat = await fs.promises.stat(resolved);
        if (stat.isDirectory()) {
          isDir = true;
        }
      } catch {
        // Path does not exist yet; check if it has a file extension
        isDir = !path.extname(resolved);
      }
    }

    if (isDir) {
      targetZipPath = path.join(resolved, `${sourceName}.zip`);
    } else {
      targetZipPath = resolved;
    }

    if (fs.existsSync(targetZipPath) && !overwrite) {
      throw new Error(`Output file already exists at "${targetZipPath}". Specify overwrite=true to overwrite.`);
    }
  }

  // Check if output zip is located inside source directory (self-inclusion)
  const relFromSource = path.relative(absSource, targetZipPath);
  const isInsideSource = !relFromSource.startsWith('..') && !path.isAbsolute(relFromSource);
  const selfExcludeRelativePath = isInsideSource ? toPosix(relFromSource) : null;

  return {
    outputPath: targetZipPath,
    selfExcludeRelativePath
  };
}

/**
 * Preview files that would be included and excluded without creating the archive.
 */
export async function previewZipContents({
  sourcePath,
  includes = [],
  excludes = [],
  maxPreviewItems = 100,
  maxScanFiles = 50000,
  calculateSize = true
}) {
  const absSource = path.resolve(sourcePath);
  const stat = await fs.promises.stat(absSource).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Source path "${sourcePath}" does not exist or is not a directory.`);
  }

  const allFiles = await scanDirectory(absSource, {
    excludes,
    skipStat: !calculateSize,
    maxFiles: maxScanFiles
  });

  const { selectedFiles, excludedFiles } = filterFileList(allFiles, {
    includes,
    excludes
  });

  const prunedDirs = allFiles.prunedDirectories || [];
  const totalUncompressedSize = calculateSize ? selectedFiles.reduce((acc, f) => acc + f.size, 0) : null;

  return {
    sourcePath: absSource,
    totalScannedFiles: allFiles.length,
    matchedFilesCount: selectedFiles.length,
    excludedFilesCount: excludedFiles.length,
    excludedDirectoriesCount: prunedDirs.length,
    excludedDirectoriesSample: prunedDirs.slice(0, 20),
    ...(calculateSize ? { estimatedUncompressedSizeBytes: totalUncompressedSize } : {}),
    ...(allFiles.isTruncated ? {
      isTruncated: true,
      warning: `Reached safety preview limit of ${maxScanFiles} files. Directory contains a very large number of files. You may want to exclude large directories such as .git or specific assets.`
    } : {}),
    selectedSample: selectedFiles.slice(0, maxPreviewItems).map(f => f.relativePath),
    excludedSample: excludedFiles.slice(0, maxPreviewItems).map(f => ({
      path: f.relativePath,
      reason: f.reason
    })),
    summary: prunedDirs.length > 0
      ? `Successfully excluded ${prunedDirs.length} directory subtree(s) (e.g. ${prunedDirs.slice(0, 3).join(', ')}). Total ${selectedFiles.length} files selected for packaging${allFiles.isTruncated ? ' (truncated by maxScanFiles limit)' : ''}.`
      : `Total ${selectedFiles.length} files selected for packaging${allFiles.isTruncated ? ' (truncated by maxScanFiles limit)' : ''}.`
  };
}

/**
 * Execute the zip packaging process.
 */
export async function zipDirectory({
  sourcePath,
  outputPath: userOutputPath,
  includes = [],
  excludes = [],
  compressionLevel = 6,
  overwrite = false,
  rootPrefix = '',
  onProgress = null
}) {
  const startTime = Date.now();
  const absSource = path.resolve(sourcePath);

  const stat = await fs.promises.stat(absSource).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Source path "${sourcePath}" does not exist or is not a directory.`);
  }

  const { outputPath, selfExcludeRelativePath } = await resolveOutputPath(absSource, userOutputPath, overwrite);

  // Ensure output parent directory exists
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  // Scan and filter files with early directory pruning
  const allFiles = await scanDirectory(absSource, { excludes, selfExcludeRelativePath });
  const { selectedFiles, excludedFiles } = filterFileList(allFiles, {
    includes,
    excludes,
    selfExcludeRelativePath
  });

  const uncompressedSizeBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  // Normalize root prefix if provided
  let normalizedPrefix = '';
  if (rootPrefix && typeof rootPrefix === 'string') {
    normalizedPrefix = toPosix(rootPrefix);
    if (normalizedPrefix && !normalizedPrefix.endsWith('/')) {
      normalizedPrefix += '/';
    }
  }

  // Create stream and archiver instance
  const outputStream = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: Math.max(0, Math.min(9, compressionLevel)) }
  });

  const totalFiles = selectedFiles.length;
  let lastRenderTime = 0;

  // Track and render progress
  archive.on('progress', (data) => {
    const processed = data.entries.processed;
    const total = data.entries.total || totalFiles;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    const now = Date.now();

    // Render terminal progress bar to stderr with throttling (every 100ms or on completion)
    if (processed === total || now - lastRenderTime >= 100) {
      lastRenderTime = now;
      const barWidth = 20;
      const completedWidth = Math.round((percent / 100) * barWidth);
      const bar = '='.repeat(completedWidth) + (completedWidth < barWidth ? '>' : '') + ' '.repeat(Math.max(0, barWidth - completedWidth - 1));
      process.stderr.write(`\r[zip-packer] Packing: [${bar}] ${percent}% (${processed}/${total} files)`);
    }

    if (onProgress && typeof onProgress === 'function') {
      try {
        onProgress({
          progress: processed,
          total,
          percent,
          bytes: data.fs?.totalBytes || 0
        });
      } catch {}
    }
  });

  const archivePromise = new Promise((resolve, reject) => {
    outputStream.on('close', () => {
      process.stderr.write('\n'); // newline after progress completes
      resolve();
    });
    outputStream.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(outputStream);

  for (const file of selectedFiles) {
    const entryName = normalizedPrefix ? `${normalizedPrefix}${file.relativePath}` : file.relativePath;
    archive.file(file.fullPath, { name: entryName });
  }

  await archive.finalize();
  await archivePromise;

  const durationMs = Date.now() - startTime;
  const outStat = await fs.promises.stat(outputPath);
  const compressedSizeBytes = outStat.size;

  const ratio = uncompressedSizeBytes > 0
    ? `${((1 - compressedSizeBytes / uncompressedSizeBytes) * 100).toFixed(1)}%`
    : '0.0%';

  const prunedDirs = allFiles.prunedDirectories || [];

  return {
    success: true,
    archivePath: outputPath,
    sourcePath: absSource,
    totalFiles: selectedFiles.length,
    uncompressedSizeBytes,
    compressedSizeBytes,
    compressionRatio: ratio,
    durationMs,
    sampleFiles: selectedFiles.slice(0, 20).map(f => f.relativePath),
    excludedFilesCount: excludedFiles.length,
    excludedDirectoriesCount: prunedDirs.length,
    excludedDirectoriesSample: prunedDirs.slice(0, 20),
    summary: prunedDirs.length > 0
      ? `Successfully excluded ${prunedDirs.length} directory subtree(s) (e.g. ${prunedDirs.slice(0, 3).join(', ')}). Packed ${selectedFiles.length} files.`
      : `Packed ${selectedFiles.length} files.`
  };
}
