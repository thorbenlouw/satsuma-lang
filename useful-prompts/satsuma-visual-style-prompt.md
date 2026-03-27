# Satsuma Visual Style Prompt

You are designing assets for the Satsuma project. Match the existing Satsuma website aesthetic closely so the output feels like part of the same product family.

## Brand Direction

Satsuma should feel warm, calm, precise, and quietly technical. The style is not cold enterprise blue, glossy startup neon, or dark cyberpunk. It combines:

- warm editorial product design
- clean technical documentation UI
- gentle code-tooling aesthetics
- approachable enterprise polish

The result should feel human-readable and machine-parseable: soft and welcoming, but also structured, exact, and trustworthy.

Also incorporate the visual language used in the Satsuma VS Code visualization: compact schema cards, precise graph topology, restrained badges, and semantic colour coding for mapping relationships.

## Colour Palette

Use this palette as the main source of truth:

- Primary orange: `#F2913D`
- Dark orange: `#D97726`
- Light orange: `#F9B97A`
- Primary green: `#5A9E6F`
- Dark green: `#3D7A52`
- Light green: `#7DBF92`
- Cream background: `#FFFAF5`
- Peach background: `#FFF3E8`
- Charcoal text: `#2D2A26`
- Warm gray secondary text: `#6B6560`
- Code background: `#FEF7EE`
- Code border: `#F5E6D3`

Optional accent colours already implied by the site:

- Soft violet accent for AI/reasoning concepts: `#8E5BB0` to `#7C6BAE`
- Terminal dark: `#1E1E1E`

Visualization-specific support colours:

- Warning amber: `#C45D22`
- Warning background: `#FEF3CD`
- Question background: `#E8F0FE`
- Question violet: `#7C6BAE`
- White card surface: `#FFFFFF`
- Soft card border: `rgba(45, 42, 38, 0.08)`
- Soft card shadow: `0 2px 8px rgba(45, 42, 38, 0.06)`

## Colour Usage Rules

- Default page background should be cream, not pure white.
- Use peach and very light orange tints for warmth and section separation.
- Orange is the main call-to-action and highlight colour.
- Green is the secondary accent for parsing, correctness, validation, and success states.
- Charcoal is the primary text colour.
- Warm gray is for secondary copy, helper labels, and subdued UI.
- Use gradients sparingly but intentionally, especially orange and green linear gradients.
- In diagrams and structural visualizations, orange should represent direct pipeline mappings and green should represent natural-language or inferred transform flows.
- Violet can be used sparingly for AI/reasoning or question-state accents.
- Avoid bright blues, saturated purples, pure black, or stark high-contrast monochrome treatments.

## Typography

- Primary UI/document font: Inter
- Monospace/code font: JetBrains Mono

Typography should feel crisp and modern, with a strong hierarchy:

- large, confident, bold headlines
- restrained body text
- generous line height
- mono used for code, filenames, commands, inline technical tokens, and structured examples

Do not use decorative serif typography, futuristic display fonts, or playful rounded tech fonts.

## Layout And Composition

Use a spacious, modern documentation-product layout:

- large hero areas
- generous padding and whitespace
- rounded cards and panels
- subtle borders instead of heavy dividers
- clear grid-based composition
- code examples presented as polished product artifacts
- graph views presented as clean node-link systems with generous spacing and legible hierarchy

Common surfaces:

- rounded cards with soft shadows
- lightly tinted panels
- code windows with warm off-white backgrounds
- dark terminal panels for CLI moments
- fixed or anchored navigation with translucent cream backgrounds and subtle blur
- schema cards with coloured header bars, mono field rows, tiny metadata badges, and understated borders
- dashed peach namespace containers for grouped domains in lineage or mapping diagrams

## Visualization Style

When the asset includes architecture, lineage, or mapping diagrams, follow the VS Code viz idiom:

- use clean node cards instead of generic flowchart boxes
- default to white cards on cream backgrounds in light mode
- use peach-tinted grouping containers for namespaces or domains
- use orange edges for pipeline/direct mappings
- use green edges, sometimes dashed, for NL or descriptive transform logic
- use small orange or peach badges for tags and metadata
- use amber warning markers and soft violet question markers
- keep connectors neat, orthogonal where possible, and intentionally spaced
- prefer compact, legible topology over decorative complexity

Cards should feel like UI components from a real developer tool, not infographic clip art.

## Dark Theme Variant

If the asset needs a dark mode or editor-embedded variant, use the VS Code-inspired dark theme:

- background: `#1E1E1E`
- card surface: `#252526`
- primary text: `#D4D4D4`
- muted text: `#9D9D9D` or `#858585`
- namespace grouping: deep brown-peach tint, not neon outlines
- orange shifts warmer and lighter: around `#F2A860` / `#E89040`
- green shifts lighter: around `#6DBF82`
- violet shifts softer: around `#A878C8`

Dark mode should still feel warm and restrained, not cyberpunk.

## Visual Language

The visual style should communicate:

- readable for humans
- structured for machines
- designed for data and developer tooling
- friendly enough for analysts and product stakeholders

Prefer:

- warm gradients
- soft shadows
- rounded corners
- understated borders
- elegant syntax-highlighted code blocks
- minimal but polished iconography
- card-based data structures
- small, semantic badges and pills
- tidy editor-style diagram composition

Avoid:

- glassmorphism-heavy UI
- harsh shadows
- edgy hacker aesthetics
- flashy 3D illustration
- noisy dashboards
- generic SaaS blue gradients

## Motion And Interaction

If motion is needed, keep it subtle and purposeful:

- gentle reveal-on-scroll
- small upward hover lift on cards
- soft shadow changes on hover
- simple tab or expand/collapse transitions

Motion should support clarity, not steal attention.

## Asset Guidance

When generating illustrations, page mockups, banners, diagrams, social cards, or other branded assets:

- keep backgrounds warm and lightly textured or softly graded
- use orange for emphasis and green for supporting contrast
- include charcoal text and warm gray supporting copy
- present code or schema snippets in JetBrains Mono
- make cards, frames, and UI chrome rounded and refined
- preserve a balance of documentation seriousness and product warmth
- for diagrams, render mappings as a premium code-tool graph rather than a corporate slide flowchart
- show structure clearly: schemas, mappings, tags, warnings, and questions should each have a distinct but restrained visual treatment

## Tone Keywords

Use these words to steer the output:

warm, precise, literate, modern, structured, calm, trustworthy, technical, elegant, approachable, parser-backed, documentation-first, enterprise-ready

## Short Art Direction Prompt

Design in the Satsuma style: a warm documentation-first technical brand with cream and peach backgrounds, citrus orange primary accents, muted leaf green secondary accents, charcoal typography, Inter for interface text, and JetBrains Mono for code. The look should feel calm, precise, elegant, and parser-backed, with rounded cards, soft shadows, subtle gradients, polished code examples, and approachable enterprise-grade clarity. Avoid generic SaaS blue, dark cyberpunk, glossy startup visuals, or noisy dashboard aesthetics.

If the asset includes lineage or mapping visualization, use compact white schema cards, peach namespace groupings, orange direct-mapping edges, green NL-transform edges, subtle badges, and a clean VS Code-quality graph layout.
