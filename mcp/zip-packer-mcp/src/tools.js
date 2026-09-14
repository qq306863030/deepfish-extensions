import { zipDirectory, previewZipContents } from './archive.js';

export const TOOLS = [
  {
    name: 'zip_directory',
    description: 'Pack a directory into a .zip archive with optional include and exclude glob patterns. If both includes and excludes are specified, excludes are applied on the included set.',
    inputSchema: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'The directory path to be zipped (absolute or relative).'
        },
        outputPath: {
          type: 'string',
          description: 'Optional destination file path for the .zip file. If omitted, creates `<directory_name>.zip` in the parent directory of sourcePath.'
        },
        includes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional glob patterns of files/directories to include (e.g. ["src/**", "*.json"]). If omitted, all files are included.'
        },
        excludes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional glob patterns of files/directories to exclude (e.g. ["node_modules/**", "*.log"]). Evaluated against the included set.'
        },
        compressionLevel: {
          type: 'integer',
          minimum: 0,
          maximum: 9,
          default: 6,
          description: 'Zip compression level from 0 (no compression) to 9 (maximum compression). Default is 6.'
        },
        overwrite: {
          type: 'boolean',
          default: false,
          description: 'Whether to overwrite the output file if it already exists. Default is false.'
        },
        rootPrefix: {
          type: 'string',
          description: 'Optional top-level folder prefix inside the zip archive (e.g. "my-project/").'
        }
      },
      required: ['sourcePath']
    }
  },
  {
    name: 'preview_zip_contents',
    description: 'Preview the list of files that would be packaged and excluded without actually creating a zip archive.',
    inputSchema: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'The directory path to inspect.'
        },
        includes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional glob patterns of files/directories to include.'
        },
        excludes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional glob patterns of files/directories to exclude.'
        },
        maxPreviewItems: {
          type: 'integer',
          default: 100,
          description: 'Maximum number of file entries to return in the sample lists.'
        }
      },
      required: ['sourcePath']
    }
  }
];

export async function handleToolCall(name, args, context = {}) {
  if (name === 'zip_directory') {
    const result = await zipDirectory({
      ...(args || {}),
      onProgress: context?.onProgress
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === 'preview_zip_contents') {
    const result = await previewZipContents(args || {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
