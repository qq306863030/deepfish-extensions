# GeoJSON 转矢量瓦片脚本

将 GeoJSON 矢量数据按 XYZ 目录结构转换为 Mapbox 矢量瓦片（PBF 格式），支持大文件处理、属性精简和几何简化。

## 脚本作用

本脚本主要用于：
- 将 GeoJSON 格式的矢量数据转换为 Mapbox Vector Tile（PBF）格式
- 按缩放级别（zoom）自动切分为瓦片金字塔结构
- 支持选择性保留属性字段，减少瓦片体积
- 根据缩放级别自动简化几何，保证渲染性能
- 输出符合 Mapbox 矢量瓦片规范（v2），兼容 Mapbox GL JS、MapLibre 等前端引擎

## 基本用法

```bash
node scripts/index.js --input <GeoJSON文件路径> --output <输出目录> [参数...]
```

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--input` | 是 | - | 输入的 GeoJSON 文件路径（支持绝对路径或相对路径） |
| `--output` | 是 | - | 瓦片输出目录路径 |
| `--minZoom` | 否 | 0 | 最小缩放级别 |
| `--maxZoom` | 否 | 14 | 最大缩放级别 |
| `--tolerance` | 否 | 3 | 几何简化容差，值越大简化程度越高，0 表示不简化 |
| `--keepProps` | 否 | 见下方 | 保留的属性字段列表，多个字段用逗号分隔 |
| `--layerName` | 否 | geojsonLayer | 矢量瓦片的图层名称 |
| `--indexMaxPoints` | 否 | 100000 | 索引最大点数，用于控制内存使用 |
| `--extent` | 否 | 4096 | 瓦片坐标范围大小 |
| `--buffer` | 否 | 64 | 瓦片缓冲区大小（像素） |
| `--bbox` | 否 | 自动计算 | 边界范围 [minLng,minLat,maxLng,maxLat]，不指定则自动从数据计算 |

**默认保留的属性字段**：`Kategori_g, K_kgunaan1, K_kgunaan2, luas_hek`

## 使用示例

### 示例 1：基础转换

将 GeoJSON 文件转换为 0-14 级矢量瓦片：

```bash
node scripts/index.js --input ./data/dbkl_landuse.geojson --output ./tiles
```

### 示例 2：指定缩放范围和容差

```bash
node scripts/index.js \
  --input "D:\LotAsas_Basemap.geojson" \
  --output "D:\tiles" \
  --minZoom 8 \
  --maxZoom 16 \
  --tolerance 0
```

### 示例 3：指定保留属性和图层名

```bash
node scripts/index.js \
  --input ./data/landuse.geojson \
  --output ./tiles \
  --minZoom 0 \
  --maxZoom 14 \
  --keepProps OBJECTID_1,Negeri,No_mukim,Seksyen,Lot_baru,Lot_lama,Pt_no,Nma_bgnan,Shape_Leng,Shape_Area \
  --layerName basemap
```

### 示例 4：完整参数配置

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

## 输出结构

瓦片按 XYZ 目录结构输出：

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

## 依赖说明

脚本会自动检测并安装所需依赖：
- `geojson-vt`：瓦片索引构建
- `vt-pbf`：PBF 编码

首次运行时会自动安装，如自动安装失败，请手动执行：

```bash
cd <项目根目录>
npm install geojson-vt vt-pbf
```

## 注意事项

1. **大文件处理**：脚本支持处理大型 GeoJSON 文件（>300MB），会自动进行内存优化
2. **属性精简**：建议仅保留必要的属性字段，可显著减少瓦片体积
3. **容差设置**：`--tolerance 0` 表示不进行几何简化，高缩放级别可适当提高容差值
4. **Windows 路径**：在 Windows 系统上使用绝对路径时，请注意反斜杠转义或使用正斜杠
