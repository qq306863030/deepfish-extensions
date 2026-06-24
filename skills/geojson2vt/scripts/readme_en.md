# GeoJSON to Vector Tiles Script

Convert GeoJSON vector data to Mapbox Vector Tiles (PBF format) in XYZ directory structure, supporting large file processing, property simplification, and geometry simplification.

## Purpose

This script is primarily used for:
- Converting GeoJSON format vector data to Mapbox Vector Tile (PBF) format
- Automatically slicing into tile pyramid structure by zoom level
- Selectively retaining property fields to reduce tile size
- Automatically simplifying geometries based on zoom level to ensure rendering performance
- Output conforms to Mapbox Vector Tile specification (v2), compatible with Mapbox GL JS, MapLibre, and other frontend engines

## Basic Usage

```bash
node scripts/index.js --input <GeoJSON file path> --output <output directory> [options...]
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--input` | Yes | - | Input GeoJSON file path (absolute or relative) |
| `--output` | Yes | - | Tile output directory path |
| `--minZoom` | No | 0 | Minimum zoom level |
| `--maxZoom` | No | 14 | Maximum zoom level |
| `--tolerance` | No | 3 | Geometry simplification tolerance, higher value means more simplification, 0 means no simplification |
| `--keepProps` | No | See below | Comma-separated list of property fields to retain |
| `--layerName` | No | geojsonLayer | Vector tile layer name |
| `--indexMaxPoints` | No | 100000 | Maximum points for index, controls memory usage |
| `--extent` | No | 4096 | Tile coordinate extent size |
| `--buffer` | No | 64 | Tile buffer size (pixels) |
| `--bbox` | No | Auto-calculated | Bounding box [minLng,minLat,maxLng,maxLat], auto-calculated if not specified |

**Default retained property fields**: `Kategori_g, K_kgunaan1, K_kgunaan2, luas_hek`

## Usage Examples

### Example 1: Basic Conversion

Convert GeoJSON to vector tiles at zoom levels 0-14:

```bash
node scripts/index.js --input ./data/dbkl_landuse.geojson --output ./tiles
```

### Example 2: Specify Zoom Range and Tolerance

```bash
node scripts/index.js \
  --input "D:\code\company\vdrag\项目支撑\2026\20260327马来西亚吉隆坡\dbkl矢量数据\矢量数据\LotAsas_Basemap.geojson" \
  --output "D:\code\company\vdrag\项目支撑\2026\20260327马来西亚吉隆坡\dbkl矢量数据\矢量数据\tiles" \
  --minZoom 8 \
  --maxZoom 16 \
  --tolerance 0
```

### Example 3: Specify Retained Properties and Layer Name

```bash
node scripts/index.js \
  --input ./data/landuse.geojson \
  --output ./tiles \
  --minZoom 0 \
  --maxZoom 14 \
  --keepProps OBJECTID_1,Negeri,No_mukim,Seksyen,Lot_baru,Lot_lama,Pt_no,Nma_bgnan,Shape_Leng,Shape_Area \
  --layerName basemap
```

### Example 4: Full Parameter Configuration

```bash
node scripts/index.js \
  --input ./data/large_file.geojson \
  --output ./tiles \
  --minZoom 0 \
  --maxZoom 16 \
  --tolerance 2 \
  --keepProps field1,field2,field3 \
  --layerName mylayer \
  --indexMaxPoints 200000 \
  --extent 4096 \
  --buffer 128
```

## Output Structure

Tiles are output in XYZ directory structure:

```
output/
├── 0/
│   ├── 0/
│   │   └── 0.pbf
│   └── 1/
│       └── 0.pbf
├── 1/
│   ├── 0/
│   │   ├── 0.pbf
│   │   └── 1.pbf
│   └── 1/
│       ├── 0.pbf
│       └── 1.pbf
└── ...
```

## Dependencies

The script automatically detects and installs required dependencies:
- `geojson-vt`: Tile index construction
- `vt-pbf`: PBF encoding

Dependencies are automatically installed on first run. If auto-installation fails, manually execute:

```bash
cd <project root>
npm install geojson-vt vt-pbf
```

## Notes

1. **Large File Processing**: The script supports processing large GeoJSON files (>300MB) with automatic memory optimization
2. **Property Simplification**: It is recommended to retain only necessary property fields, which can significantly reduce tile size
3. **Tolerance Setting**: `--tolerance 0` means no geometry simplification; higher tolerance values can be used for higher zoom levels
4. **Windows Paths**: When using absolute paths on Windows, be aware of backslash escaping or use forward slashes
