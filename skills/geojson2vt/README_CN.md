[中文](README_CN.md) | [English](./README.md)

# GeoJSON2VT - GeoJSON转矢量瓦片工具

将GeoJSON矢量数据按XYZ目录结构转换为Mapbox矢量瓦片（PBF格式），支持大文件处理、属性精简、几何简化，适用于GIS数据发布和Web地图服务。

## 快速开始

### ① 全局安装 deepfish-ai

```bash
npm install deepfish-ai -g
```

### ② 安装 Skill

```bash
ai skill add geojson2vt
```

安装后可通过以下命令确认：

```bash
ai skill ls
```

启用该 Skill：

```bash
ai skill enable geojson2vt
```

### ③ 使用示例

```bash
ai 将landuse.geojson转换为矢量瓦片，输出到tiles目录，zoom级别0-14
```

## 功能特性

- **矢量瓦片生成**：将GeoJSON数据按XYZ瓦片金字塔结构切分为PBF格式矢量瓦片
- **大文件支持**：支持处理大型GeoJSON文件，自动分块处理避免内存溢出
- **属性精简**：可选择性保留关键属性字段，减少瓦片体积
- **几何简化**：根据缩放级别自动简化几何，保证不同层级下的渲染性能
- **标准兼容**：输出符合Mapbox矢量瓦片规范（v2），可直接用于Mapbox GL JS、MapLibre等前端引擎
