import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { filterFileList } from './src/filter.js';
import { zipDirectory, previewZipContents } from './src/archive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, '.test_tmp_dir');
const OUTPUT_DIR = path.join(__dirname, '.test_output_dir');

async function setupTestFiles() {
  await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
  await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  const files = [
    ['src/index.js', 'console.log("hello world");'],
    ['src/components/button.jsx', 'export const Button = () => null;'],
    ['src/components/button.test.jsx', 'test("button renders", () => {});'],
    ['node_modules/fake-dep/index.js', 'module.exports = 42;'],
    ['nested/sub/node_modules/dep/index.js', 'module.exports = "nested";'],
    ['nested/sub/node_modules/dep/node_modules/deep/index.js', 'module.exports = "deep";'],
    ['debug.log', 'error occurred at line 10'],
    ['README.md', '# Test Project']
  ];

  for (const [relPath, content] of files) {
    const full = path.join(TEST_DIR, relPath);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, content, 'utf8');
  }
}

async function cleanup() {
  await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
  await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true });
}

async function runTests() {
  console.log('--- Starting zip-packer-mcp tests ---');

  // Unit tests for filterFileList
  console.log('Testing filterFileList unit logic...');
  const mockFiles = [
    { relativePath: 'src/index.js', size: 100 },
    { relativePath: 'src/components/button.jsx', size: 100 },
    { relativePath: 'src/components/button.test.jsx', size: 100 },
    { relativePath: 'node_modules/dep/index.js', size: 100 },
    { relativePath: 'debug.log', size: 50 },
    { relativePath: 'README.md', size: 200 }
  ];

  // 1. No filter
  const r1 = filterFileList(mockFiles);
  assert.equal(r1.selectedFiles.length, 6, 'All files should be selected without filter');

  // 2. Only includes
  const r2 = filterFileList(mockFiles, { includes: ['src/**'] });
  assert.equal(r2.selectedFiles.length, 3, 'Only files in src/ should be selected');

  // 3. Only excludes
  const r3 = filterFileList(mockFiles, { excludes: ['node_modules', '*.log'] });
  assert.equal(r3.selectedFiles.length, 4, 'node_modules and log should be excluded');

  // 4. Includes + Excludes: excludes evaluated on includes
  const r4 = filterFileList(mockFiles, {
    includes: ['src/**'],
    excludes: ['**/*.test.*']
  });
  assert.equal(r4.selectedFiles.length, 2, 'Should include src/ but exclude test files');
  assert.deepEqual(
    r4.selectedFiles.map(f => f.relativePath).sort(),
    ['src/components/button.jsx', 'src/index.js']
  );

  console.log('✓ filterFileList unit tests passed.');

  // Integration tests
  await setupTestFiles();

  // Test 1: Full pack
  console.log('Integration Test 1: Full directory pack');
  const out1 = path.join(OUTPUT_DIR, 'test1.zip');
  const res1 = await zipDirectory({
    sourcePath: TEST_DIR,
    outputPath: out1
  });
  assert.equal(res1.success, true);
  assert.equal(res1.totalFiles, 8);
  assert.ok(fs.existsSync(out1));

  // Test 2: Only includes
  console.log('Integration Test 2: Includes only');
  const out2 = path.join(OUTPUT_DIR, 'test2.zip');
  const res2 = await zipDirectory({
    sourcePath: TEST_DIR,
    outputPath: out2,
    includes: ['src/**']
  });
  assert.equal(res2.totalFiles, 3);

  // Test 3: Only excludes (verifying nested node_modules are pruned)
  console.log('Integration Test 3: Excludes only (including deeply nested node_modules)');
  const out3 = path.join(OUTPUT_DIR, 'test3.zip');
  const res3 = await zipDirectory({
    sourcePath: TEST_DIR,
    outputPath: out3,
    excludes: ['node_modules', '*.log']
  });
  assert.equal(res3.totalFiles, 4);
  assert.ok(!res3.sampleFiles.some(f => f.includes('node_modules')));

  // Test 4: Includes AND Excludes (core requirement)
  console.log('Integration Test 4: Includes AND Excludes combination');
  const out4 = path.join(OUTPUT_DIR, 'test4.zip');
  const res4 = await zipDirectory({
    sourcePath: TEST_DIR,
    outputPath: out4,
    includes: ['src/**', 'README.md'],
    excludes: ['**/*.test.*']
  });
  assert.equal(res4.totalFiles, 3); // index.js, button.jsx, README.md
  assert.deepEqual(
    res4.sampleFiles.sort(),
    ['README.md', 'src/components/button.jsx', 'src/index.js']
  );

  // Test 5: Default outputPath (sibling directory)
  console.log('Integration Test 5: Default outputPath');
  const res5 = await zipDirectory({
    sourcePath: TEST_DIR,
    overwrite: true
  });
  assert.equal(res5.success, true);
  assert.ok(fs.existsSync(res5.archivePath));
  // Clean up the sibling zip generated
  await fs.promises.rm(res5.archivePath, { force: true });

  // Test 6: Self-inclusion guard
  console.log('Integration Test 6: Self-inclusion guard');
  const internalZip = path.join(TEST_DIR, 'inside.zip');
  const res6 = await zipDirectory({
    sourcePath: TEST_DIR,
    outputPath: internalZip,
    overwrite: true
  });
  assert.equal(res6.success, true);
  assert.equal(res6.totalFiles, 8); // Not 9, internal zip was excluded
  assert.ok(!res6.sampleFiles.includes('inside.zip'));

  // Test 7: Preview tool
  console.log('Integration Test 7: preview_zip_contents');
  const previewRes = await previewZipContents({
    sourcePath: TEST_DIR,
    includes: ['src/**'],
    excludes: ['**/*.test.*']
  });
  assert.equal(previewRes.matchedFilesCount, 2);
  assert.equal(previewRes.selectedSample.length, 2);

  // Test 8: Progress callback verification
  console.log('Integration Test 8: Progress monitoring & callback');
  const progressEvents = [];
  const out8 = path.join(OUTPUT_DIR, 'test8_progress.zip');
  const res8 = await zipDirectory({
    sourcePath: TEST_DIR,
    outputPath: out8,
    onProgress: (p) => progressEvents.push(p)
  });
  assert.equal(res8.success, true);
  assert.ok(progressEvents.length > 0, 'Should capture at least one progress event');
  const lastEvt = progressEvents[progressEvents.length - 1];
  assert.equal(lastEvt.progress, lastEvt.total, 'Processed files should match total files');
  assert.ok(lastEvt.total >= 6);

  // Clean up
  await cleanup();
  console.log('✓ All integration tests passed successfully!');
}

runTests().catch(async (err) => {
  console.error('Test failed:', err);
  await cleanup();
  process.exit(1);
});
