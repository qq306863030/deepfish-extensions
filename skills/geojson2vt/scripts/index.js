#!/usr/bin/env node

/**
 * GeoJSON → 矢量瓦片 (PBF) 核心转换脚本
 *
 * 功能：将大尺寸 GeoJSON 文件（>300MB）按 zoom 级别切分为
 *       Mapbox Vector Tile（PBF格式）瓦片金字塔。
 *
 * 依赖：geojson-vt（瓦片索引） + vt-pbf（PBF编码）
 * 规范：Node.js + CommonJS
 *
 * 用法示例：
 *   node scripts/index.js \
 *     --input ./data/dbkl_landuse.geojson \
 *     --output ./tiles \
 *     --minZoom 0 \
 *     --maxZoom 14
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// 1. 依赖检查与安装
// ---------------------------------------------------------------------------
function ensureDependencies() {
  const required = ['geojson-vt', 'vt-pbf'];
  const missing = [];

  for (const pkg of required) {
    try {
      require.resolve(pkg);
    } catch (_) {
      missing.push(pkg);
    }
  }

  if (missing.length > 0) {
    console.log(`[依赖] 检测到缺少: ${missing.join(', ')}，正在自动安装...`);
    const registry = 'https://registry.npmjs.org/';
    const cmd = `npm install --registry=${registry} ${missing.join(' ')}`;
    try {
      execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
      console.log('[依赖] 安装完成。');
    } catch (err) {
      console.error('[依赖] 安装失败，请手动执行：');
      console.error(`  cd ${path.resolve(__dirname, '..')}`);
      console.error(`  ${cmd}`);
      process.exit(1);
    }
  } else {
    console.log('[依赖] geojson-vt、vt-pbf 已就绪。');
  }
}

// ---------------------------------------------------------------------------
// 2. 命令行参数解析
// ---------------------------------------------------------------------------
function parseArgs() {
  const argv = process.argv.slice(2);
  const args = {};

  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    if (cur.startsWith('--')) {
      const key = cur.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        // 布尔标志
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }

  // ---- 必填参数校验 ----
  if (!args.input) {
    console.error('错误: 缺少 --input 参数（GeoJSON文件路径）。');
    process.exit(1);
  }
  if (!args.output) {
    console.error('错误: 缺少 --output 参数（瓦片输出目录）。');
    process.exit(1);
  }

  // ---- 默认值 ----
  return {
    input: args.input,
    output: args.output,
    minZoom: parseInt(args.minZoom, 10) || 0,
    maxZoom: parseInt(args.maxZoom, 10) || 14,
    tolerance: parseFloat(args.tolerance) || 3,
    indexMaxPoints: parseInt(args.indexMaxPoints, 10) || 100000,
    extent: parseInt(args.extent, 10) || 4096,
    buffer: parseInt(args.buffer, 10) || 64,
    bbox: args.bbox
      ? args.bbox.split(',').map(Number) // [minLng, minLat, maxLng, maxLat]
      : null,
    keepProps: args.keepProps
      ? args.keepProps.split(',').map((s) => s.trim())
      : ['Kategori_g', 'K_kgunaan1', 'K_kgunaan2', 'luas_hek'],
    layerName: args.layerName || 'geojsonLayer',
  };
}

// ---------------------------------------------------------------------------
// 3. 加载 GeoJSON
// ---------------------------------------------------------------------------
function loadGeoJSON(filePath) {
  const stat = fs.statSync(filePath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`[加载] 文件大小: ${sizeMB} MB (${stat.size} bytes)`);

  const raw = fs.readFileSync(filePath, 'utf-8');
  const geojson = JSON.parse(raw);
  console.log(`[加载] Feature 总数: ${geojson.features.length}`);
  // 自动计算边界 [minLng, minLat, maxLng, maxLat]
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const f of geojson.features) {
    let coords = [];
    if (f.geometry.type === 'Point') {
      coords = [f.geometry.coordinates];
    } else if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiPoint') {
      coords = f.geometry.coordinates;
    } else if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiLineString') {
      coords = f.geometry.coordinates.flat();
    } else if (f.geometry.type === 'MultiPolygon') {
      coords = f.geometry.coordinates.flat(2);
    }
    for (const c of coords) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const [lng, lat] = c;
      if (typeof lng !== 'number' || typeof lat !== 'number') continue;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  // bbox外扩1%
  const lngPad = (maxLng - minLng) * 0.01;
  const latPad = (maxLat - minLat) * 0.01;
  const paddedBbox = [minLng - lngPad, minLat - latPad, maxLng + lngPad, maxLat + latPad];
  geojson.__bbox = paddedBbox;
  console.log(`[边界] 自动计算bbox: ${[minLng, minLat, maxLng, maxLat].join(',')}`);
  console.log(`[边界] 外扩后bbox: ${paddedBbox.join(',')}`);
  return geojson;
}

// ---------------------------------------------------------------------------
// 4. 属性精简
// ---------------------------------------------------------------------------
function simplifyProperties(features, keepProps) {
  const beforeTotal = features.reduce((sum, f) => sum + Object.keys(f.properties || {}).length, 0);

  for (const feature of features) {
    if (!feature.properties) continue;
    const keys = Object.keys(feature.properties);
    for (const key of keys) {
      if (!keepProps.includes(key)) {
        delete feature.properties[key];
      }
    }
  }

  const afterTotal = features.reduce((sum, f) => sum + Object.keys(f.properties || {}).length, 0);
  console.log(`[精简] 保留字段: ${keepProps.join(', ')}`);
  console.log(`[精简] 属性字段数: ${beforeTotal} → ${afterTotal}（减少 ${beforeTotal - afterTotal}）`);

  return features;
}

// ---------------------------------------------------------------------------
// 5. 构建瓦片索引 + 6. 生成 PBF 瓦片
// ---------------------------------------------------------------------------
function buildVectorTiles(geojson, opts) {
  const geojsonvt = require('geojson-vt').default;
  const vtpbf = require('vt-pbf');

  // ---- 构建索引 ----
  const tileIndexOpts = {
    maxZoom: opts.maxZoom,
    indexMaxZoom: opts.maxZoom,
    tolerance: opts.tolerance,
    indexMaxPoints: opts.indexMaxPoints,
    extent: opts.extent,
    buffer: opts.buffer,
    generateId: false,
  };

  console.log(`[索引] 构建参数:`, JSON.stringify(tileIndexOpts, null, 2));
  const tileIndex = geojsonvt(geojson, tileIndexOpts);

  // ---- 统计并生成 PBF（仅遍历bbox范围内tile） ----
  // 获取边界
  const bbox = opts.bbox || geojson.__bbox;
  function lngLatToTile(lng, lat, z) {
    // Web Mercator
    const x = Math.floor(((lng + 180) / 360) * (1 << z));
    const y = Math.floor(
      (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * (1 << z)
    );
    return [x, y];
  }
  let totalTiles = 0;
  const zoomTileCounts = {};
  const outputDir = path.resolve(opts.output);
  let generated = 0;
  const startTime = Date.now();
  for (let z = opts.minZoom; z <= opts.maxZoom; z++) {
    // 计算bbox在该zoom下的tile范围
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const [minX, maxY] = lngLatToTile(minLng, minLat, z);
    const [maxX, minY] = lngLatToTile(maxLng, maxLat, z);
    let zGenerated = 0;
    let count = 0;
    for (let x = Math.max(0, minX); x <= Math.min((1 << z) - 1, maxX); x++) {
      for (let y = Math.max(0, minY); y <= Math.min((1 << z) - 1, maxY); y++) {
        const tile = tileIndex.getTile(z, x, y);
        if (!tile || (!tile.features && tile.numFeatures === 0)) continue;
        count++;
        // vt-pbf fromGeojsonVt 参数格式：{ [layerName]: tile }
        const pbf = vtpbf.fromGeojsonVt({ [opts.layerName]: tile });
        const tileDir = path.join(outputDir, String(z), String(x));
        fs.mkdirSync(tileDir, { recursive: true });
        const tilePath = path.join(tileDir, `${y}.pbf`);
        fs.writeFileSync(tilePath, pbf);
        generated++;
        zGenerated++;
        if (generated % 500 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[进度] 已生成 ${generated} 个瓦片 (${elapsed}s)`);
        }
      }
    }
    zoomTileCounts[z] = count;
    totalTiles += count;
    console.log(`[完成] zoom ${z}: ${zGenerated} 个瓦片已写入`);
  }
  console.log(`[统计] 瓦片总数: ${totalTiles}`);
  for (let z = opts.minZoom; z <= opts.maxZoom; z++) {
    console.log(`  zoom ${z}: ${zoomTileCounts[z]} 个瓦片`);
  }
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n========================================`);
  console.log(`[完成] 全部瓦片生成完毕！`);
  console.log(`  总瓦片数: ${generated}`);
  console.log(`  输出目录: ${outputDir}`);
  console.log(`  总耗时:   ${totalTime}s`);
  console.log(`========================================`);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
function main() {
  console.log('══════════════════════════════════════════');
  console.log('  GeoJSON → Vector Tiles (PBF)');
  console.log('══════════════════════════════════════════\n');

  // 1. 依赖
  ensureDependencies();

  // 2. 参数
  const opts = parseArgs();
  console.log('[配置] 参数摘要:');
  console.log(`  input:           ${opts.input}`);
  console.log(`  output:          ${opts.output}`);
  console.log(`  zoom:            ${opts.minZoom} ~ ${opts.maxZoom}`);
  console.log(`  tolerance:       ${opts.tolerance}`);
  console.log(`  indexMaxPoints:  ${opts.indexMaxPoints}`);
  console.log(`  extent:          ${opts.extent}`);
  console.log(`  buffer:          ${opts.buffer}`);
  console.log(`  bbox:            ${opts.bbox ? opts.bbox.join(',') : '(无)'}`);
  console.log(`  layerName:       ${opts.layerName}`);
  console.log(`  keepProps:       ${opts.keepProps.join(', ')}\n`);

  // 3. 加载
  const geojson = loadGeoJSON(opts.input);

  // 4. 精简
  simplifyProperties(geojson.features, opts.keepProps);

  // 5 + 6: 索引 + 生成 PBF
  buildVectorTiles(geojson, opts);
}

main();
