# DeepFish Novel Creation Extension Tool

English | [中文](https://github.com/qq306863030/deepfish-extensions/blob/master/deepfish-novel-generate/README_CN.md)

## Overview

DeepFish Novel Creation Extension Tool is a powerful AI-assisted writing tool designed for the complete workflow of novel creation. This tool leverages AI technology to help authors create complete novels from concept to finished product, including outline generation, chapter planning, content creation, progress management, and checkpoint resumption.

## Core Features

### 1. Intelligent Outline Generation
- Automatically generate detailed novel outlines based on themes, genres, and settings
- Include complete elements such as core conflicts, main characters, story structure
- Ensure outlines meet target word count and genre requirements

### 2. Chapter Planning System
- Intelligently plan chapter structure based on outlines and target word count
- Generate titles, summaries, key plot points, and characters for each chapter
- Support custom chapter counts and word allocation

### 3. AI Content Creation
- Generate high-quality novel content chapter by chapter
- Built-in context management mechanism to maintain plot continuity and character consistency
- Support long-form writing with automatic handling of large texts

### 4. Progress Management & Tracking
- Real-time statistics for writing progress, chapter completion, and word counts
- Visual progress reports to understand creative status
- Support checkpoint resumption for seamless continuation

### 5. Project Management System
- Complete project file structure management
- Automatic saving of all creative data
- Support for managing multiple projects simultaneously

## Quick Start

### Installation Steps

1. **Install deepfish-ai globally**
   ```bash
   npm install deepfish-ai -g
   ```

2. **Install novel creation extension globally**
   ```bash
   npm install deepfish-novel-generate -g
   ```

3. **Start using**
   Call novel creation functions in DeepFish AI environment:
   ```
   ai help me write a fantasy novel
   ```

### Basic Usage Flow

1. **Initialize novel project**
   ```javascript
   const result = await novelCreator_initializeNovel(
     "Journey of Magic",
     "A story of courage and growth through adventure",
     50000,
     "Fantasy",
     "Medieval magical world"
   );
   ```

2. **Generate novel outline**
   ```javascript
   const result = await novelCreator_generateOutline("novel_data.json");
   ```

3. **Generate chapter plan**
   ```javascript
   const result = await novelCreator_generateChapterPlan("novel_data.json");
   ```

4. **Start writing**
   ```javascript
   // Generate Chapter 1
   const result = await novelCreator_generateChapterContent("novel_data.json", 0);
   
   // Generate 3 chapters in batch
   const result = await novelCreator_generateChapterContent("novel_data.json", 1, 3);
   ```

5. **Check progress**
   ```javascript
   const result = await novelCreator_getProgress("novel_data.json");
   ```

6. **Resume from checkpoint**
   ```javascript
   const result = await novelCreator_resumeWriting("novel_data.json");
   ```

## Function List

| Function Name | Description |
|--------------|-------------|
| `novelCreator_initializeNovel` | Initialize novel project, create project structure and data files |
| `novelCreator_generateOutline` | Generate detailed novel outline based on input information |
| `novelCreator_generateChapterPlan` | Generate chapter plan based on outline |
| `novelCreator_generateChapterContent` | Generate novel content for specified chapters |
| `novelCreator_resumeWriting` | Continue writing unfinished chapters from checkpoint |
| `novelCreator_getProgress` | Get current writing progress and statistics |
| `novelCreator_extensionRule` | Get usage documentation for the extension tool |

## Project Structure

Created novel projects include the following file structure:

```
novel_novel_title/
├── novel_data.json          # Novel core data file
├── outline.md               # Novel outline document
├── chapter_plan.md          # Chapter planning document
├── progress.json            # Progress statistics file
├── chapters/                # Chapter content directory
│   ├── chapter_1.md        # Chapter 1 content
│   ├── chapter_2.md        # Chapter 2 content
│   └── ...
└── metadata/               # Metadata directory (optional)
```

## Technical Features

### 1. Context Management Mechanism
- **Memory System**: Record key plot points, character traits, and story settings
- **Consistency Check**: Ensure character personality and plot development continuity
- **Previous Context Summary**: Automatically provide previous context when generating new chapters

### 2. Long-form Processing Capability
- **Chapter-based Processing**: Split long novels into manageable chapters
- **Progress Tracking**: Real-time monitoring of writing progress and word count
- **Checkpoint Resumption**: Support pausing and resuming creation at any time

### 3. Intelligent Writing Assistance
- **Genre Adaptation**: Adjust writing style according to different novel genres
- **Theme Consistency**: Ensure content always revolves around the core theme
- **Quality Control**: Optimize content quality through multiple iterations

## Use Cases

### 1. Novice Writers
- Lack writing experience, need AI assistance to complete full works
- Require structured guidance and outline support
- Want to learn professional creative processes

### 2. Professional Writers
- Seek creative inspiration and new ideas
- Need efficient handling of long-form writing
- Want to reduce writing pressure and focus on creativity

### 3. Content Creators
- Need to produce novel content in batches
- Manage multiple creative projects
- Maintain creation quality and efficiency

## Best Practices

### 1. Planning Phase
- Carefully define themes and story backgrounds
- Set reasonable target word counts
- Choose appropriate novel genres

### 2. Writing Phase
- Generate content in batches to avoid generating too much at once
- Regularly check progress to ensure correct writing direction
- Use checkpoint resumption to maintain writing continuity

### 3. Post-processing Phase
- Review AI-generated content and make necessary modifications
- Maintain character consistency and plot coherence
- Add personal style and creative elements

## Frequently Asked Questions

### Q1: How is the quality of AI-generated content ensured?
A: This tool ensures quality through:
- Detailed outline and chapter planning guidance
- Context management to ensure coherence
- Multiple iteration optimization mechanisms
- Users can review and modify at any time

### Q2: What novel genres are supported?
A: Supports mainstream novel genres, including but not limited to:
- Fantasy, Science Fiction, Mystery, Romance
- Historical, Urban, Wuxia, Xuanhuan
- Other custom genres

### Q3: How are long novels handled?
A: Using chapter-based processing strategy:
- Split long novels into multiple chapters
- Each chapter is independently generated and saved
- Maintain overall coherence through context management

### Q4: Does it support both Chinese and English writing?
A: Currently primarily supports Chinese writing, but can also be used for English writing. Word count function supports both Chinese and English.

### Q5: How is data security ensured?
A: All creative data is stored locally and not uploaded to any servers. Users have complete control over their creative content.

## Technical Support

For issues or suggestions, please contact us through:

- GitHub Issues: [deepfish-extensions](https://github.com/qq306863030/deepfish-extensions)
- Documentation: [DeepFish AI Documentation](https://deepfish.ai/docs)
- Email: support@deepfish.ai

## Version History

- v1.0.0 (Initial Release)
  - Basic novel creation functionality
  - Outline generation and chapter planning
  - Content generation and progress management
  - Checkpoint resumption support

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

**Start your creative journey! Let AI be your writing partner and create wonderful novel worlds together.**