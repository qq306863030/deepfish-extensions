---
name: "geojson2vt"
description: "将GeoJSON矢量数据转换为Mapbox矢量瓦片(XYZ目录结构PBF格式)，支持大文件加载、属性精简、几何简化和可配置缩放级别"
homepage: "https://github.com/deepfish-ai/geojson2vt"
---

# geojson2vt

## 一、概述

### 核心功能
将GeoJSON文件转换为XYZ目录结构的PBF矢量瓦片，基于Mapbox矢量瓦片规范（Mapbox Vector Tile Specification）。

### 适用场景
- GIS数据发布：将大规模矢量数据发布为Web地图服务
- Web地图服务：为Mapbox GL JS、MapLibre GL等前端地图库提供瓦片数据源
- 空间数据可视化：将地理空间数据转换为高效的分层瓦片结构，支持多级缩放

### 能力边界
- ✅ 支持GeoJSON格式（FeatureCollection）输入
- ✅ 输出PBF格式矢量瓦片（XYZ目录结构）
- ❌ 不支持其他矢量格式（如Shapefile、KML、GPKG）
- ❌ 不支持栅格瓦片（PNG/JPEG/WebP）
- ❌ 不支持WMS/WMTS等OGC标准服务

## 二、环境依赖

### 运行环境
- Node.js >= 14.0.0

### npm依赖包
| 包名 | 用途 | 版本要求 |
|------|------|----------|
| geojson-vt | 瓦片索引构建（将GeoJSON切分为矢量瓦片） | >= 3.2 |
| vt-pbf | PBF编码（将瓦片数据编码为Protocol Buffers二进制格式） | >= 3.1 |

> 脚本会自动检查依赖是否已安装，未安装时自动执行 `npm install`。

## 三、使用指令

### ⚠️ 重要：执行前必须进行参数交互

**在调用转换脚本之前，Agent 必须使用交互工具（inquirer）向用户逐一询问以下关键参数**，不得跳过或自行假设。用户直接按回车则使用默认值。

#### 询问流程（按顺序执行）

**第一步：缩放级别**
- 使用 `inquirerNumber` 询问最小缩放级别（minZoom），默认值 0，提示："请输入最小缩放级别（0-22）："
- 使用 `inquirerNumber` 询问最大缩放级别（maxZoom），默认值 14，提示："请输入最大缩放级别（0-22）："

**第二步：属性字段**
- 先读取 GeoJSON 文件的前几个 feature，提取所有属性字段名
- 使用 `inquirerList`（多选模式）让用户选择要保留的属性字段，默认选中全部
- 如无法提取字段列表，使用 `inquirerInput` 提示用户输入逗号分隔的字段名，默认值 "Kategori_g,K_kgunaan1,K_kgunaan2,luas_hek"

**第三步：图层名称**
- 使用 `inquirerInput` 询问PBF中的图层名称，默认值 `geojsonLayer`
- 提示："请输入矢量瓦片的图层名称（用于前端加载时识别图层）："

**第四步：几何简化容差（可选）**
- 使用 `inquirerNumber` 询问容差值（tolerance），默认值 3，提示："请输入几何简化容差（0=不简化，数值越大简化越激进，默认3）："

**第五步：边界框过滤（可选）**
- 使用 `inquirerInput` 询问边界框，默认值为空（不裁剪），提示："请输入边界框过滤范围（格式：minLng,minLat,maxLng,maxLat，留空则不裁剪）："

**第六步：确认汇总**
- 汇总所有参数展示给用户
- 使用 `inquirerConfirm` 确认，提示："以上参数确认无误，开始转换？"

> **注意**：如果用户在最初请求中已经明确指定了某个参数值（如"minZoom=5"、"保留字段 name,area"），则跳过对应询问步骤，直接使用用户指定的值。

### 主脚本
`scripts/index.js`

### 调用方式
```bash
node scripts/index.js --input <geojson文件> --output <输出目录> [选项]
```

### 参数说明

| 参数 | 说明 | 是否必需 | 默认值 |
|------|------|----------|--------|
| `--input` | GeoJSON文件路径 | ✅ 必需 | - |
| `--output` | 瓦片输出目录 | ✅ 必需 | - |
| `--minZoom` | 最小缩放级别 | 可选 | 0 |
| `--maxZoom` | 最大缩放级别 | 可选 | 14 |
| `--tolerance` | 几何简化容差（Douglas-Peucker算法） | 可选 | 3 |
| `--indexMaxPoints` | 瓦片最大点数 | 可选 | 100000 |
| `--extent` | 瓦片范围（瓦片坐标系宽度） | 可选 | 4096 |
| `--buffer` | 瓦片缓冲区大小（像素） | 可选 | 64 |
| `--bbox` | 边界框过滤，格式 `minLng,minLat,maxLng,maxLat` | 可选 | - |
| `--layerName` | 矢量瓦片的图层名称（前端加载时识别用） | 可选 | geojsonLayer |
| `--keepProps` | 保留的属性字段（逗号分隔） | 可选 | Kategori_g,K_kgunaan1,K_kgunaan2,luas_hek |

### 执行步骤
1. **参数收集**：按上述交互流程逐一询问用户关键参数
2. **依赖检查**：检查并自动安装 `geojson-vt` 和 `vt-pbf` 依赖
3. **加载数据**：读取GeoJSON文件，解析为FeatureCollection
4. **构建索引**：使用 `geojson-vt` 构建多级瓦片索引
5. **生成瓦片**：遍历各级缩放级别，编码并输出PBF瓦片文件

### 示例
```bash
# 基本用法
node scripts/index.js --input ./data/landuse.geojson --output ./tiles

# 自定义缩放级别
node scripts/index.js --input ./data/landuse.geojson --output ./tiles --minZoom 5 --maxZoom 18

# 边界框过滤 + 属性精简
node scripts/index.js --input ./data/landuse.geojson --output ./tiles --bbox 101.6,3.0,101.8,3.2 --keepProps Kategori_g,luas_hek
```

## 四、输入输出规范

### 输入
- **格式**：标准GeoJSON FeatureCollection
- **几何类型**：支持Point、LineString、Polygon、MultiPoint、MultiLineString、MultiPolygon
- **坐标系**：WGS84（EPSG:4326），经纬度坐标
- **编码**：UTF-8

### 输出
- **目录结构**：XYZ瓦片目录
  ```
  output/
  ├── 0/
  │   └── 0/
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
- **瓦片格式**：Protocol Buffers二进制（.pbf），遵循Mapbox Vector Tile Specification v2.1
- **命名规则**：`{z}/{x}/{y}.pbf`，其中z为缩放级别，x为列号，y为行号

## 五、注意事项与限制

### 技术细节
1. **geojson-vt导入方式**：`geojson-vt` 使用 `.default` 导出（ES模块转CommonJS兼容），脚本中使用 `require('geojson-vt').default` 引用
2. **模块规范**：脚本使用Node.js CommonJS模块规范（`require`/`module.exports`）

### 性能与资源
3. **大文件处理**：处理超过300MB的GeoJSON文件时，内存占用约为文件大小的1.5-2倍，建议确保运行环境有充足内存
4. **瓦片生成时间**：大型数据集（>100万要素）在高缩放级别下生成瓦片可能耗时较长

### 数据处理
5. **属性精简**：使用 `--keepProps` 参数控制保留哪些属性字段，减小瓦片体积
6. **几何简化**：通过 `--tolerance` 参数控制简化程度，数值越大简化越激进
7. **边界框裁剪**：使用 `--bbox` 参数可仅处理指定矩形区域内的要素，减少输出瓦片数量
