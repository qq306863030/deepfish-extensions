[English](README.md) | [中文](./README_CN.md)

# GeoJSON2VT - GeoJSON to Vector Tiles Tool

Convert GeoJSON vector data to Mapbox Vector Tiles in XYZ directory structure (PBF format), supporting large file processing, property simplification, and geometry simplification. Suitable for GIS data publishing and web map services.

## Quick Start

### ① Install deepfish-ai globally

```bash
npm install deepfish-ai -g
```

### ② Install the Skill

```bash
ai skill add geojson2vt
```

Verify the installation:

```bash
ai skill ls
```

Enable the Skill:

```bash
ai skill enable geojson2vt
```

### ③ Usage Example

```bash
ai convert landuse.geojson to vector tiles, output to tiles directory, zoom levels 0-14
```

## Features

- **Vector Tile Generation**: Slice GeoJSON data into PBF-format vector tiles organized in the XYZ tile pyramid structure
- **Large File Support**: Handle large GeoJSON files with automatic chunked processing to avoid memory overflow
- **Property Simplification**: Selectively retain only key property fields to reduce tile size
- **Geometry Simplification**: Automatically simplify geometries based on zoom level to ensure optimal rendering performance at all scales
- **Standards Compliance**: Output conforms to the Mapbox Vector Tile specification (v2), compatible with frontend engines such as Mapbox GL JS and MapLibre
