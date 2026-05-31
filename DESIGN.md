---
name: Lively Everyday
colors:
  surface: '#fcfaec'
  surface-dim: '#dcdacd'
  surface-bright: '#fcfaec'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f4e6'
  surface-container: '#f0eee0'
  surface-container-high: '#ebe9db'
  surface-container-highest: '#e5e3d5'
  on-surface: '#1c1c14'
  on-surface-variant: '#4d4546'
  inverse-surface: '#313128'
  inverse-on-surface: '#f3f1e3'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#615e5d'
  primary: '#1b1919'
  on-primary: '#ffffff'
  primary-container: '#302e2e'
  on-primary-container: '#999595'
  inverse-primary: '#cac5c5'
  secondary: '#5e5f5b'
  on-secondary: '#ffffff'
  secondary-container: '#e3e3dd'
  on-secondary-container: '#646561'
  tertiary: '#1b1a14'
  on-tertiary: '#ffffff'
  tertiary-container: '#302f28'
  on-tertiary-container: '#9a968d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7e1e1'
  primary-fixed-dim: '#cac5c5'
  on-primary-fixed: '#1d1b1b'
  on-primary-fixed-variant: '#494646'
  secondary-fixed: '#e3e3dd'
  secondary-fixed-dim: '#c7c7c2'
  on-secondary-fixed: '#1b1c19'
  on-secondary-fixed-variant: '#464743'
  tertiary-fixed: '#e7e2d7'
  tertiary-fixed-dim: '#cac6bc'
  on-tertiary-fixed: '#1d1c15'
  on-tertiary-fixed-variant: '#49473f'
  background: '#fcfaec'
  on-background: '#1c1c14'
  surface-variant: '#e5e3d5'
typography:
  display-lg:
    fontFamily: Source Sans 3
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Sans 3
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Sans 3
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system moves away from "Zen" minimalism in favor of a **"Vibrant Daily Life"** aesthetic. It evokes the feeling of a well-loved physical journal or a creative planner—tactile, energetic, and deeply approachable. The style is a hybrid of **Modern Corporate** reliability and a **Tactile/Sticker** aesthetic. 

The goal is to make every interaction feel like adding a new entry to a colorful life. We use heavy contrast, bold typography, and energetic accents to create a space that feels lived-in and creative rather than cold and clinical.

- **Tone:** Energetic, friendly, creative, and dependable.
- **Visual Style:** High-contrast elements set against a warm, paper-like base, utilizing pill-shaped geometry and semi-transparent "glow" effects.

## Colors

The palette is anchored by a warm, textured base (**#F4EFE4**) that mimics premium paper. We use high-density ink colors for structure and a wide spectrum of energetic accents for functional feedback and personality.

- **Base:** Use `#F4EFE4` for all primary backgrounds to maintain warmth.
- **Core Ink:** `#302E2E` is used for primary text and heavy structural elements (borders, headers).
- **Secondary Stone:** `#5A5B57` provides a softer contrast for secondary text and icons.
- **Functional Accents:** Derived from the 12-color wheel. These should be used for "sticker" labels, active navigation states, and progress indicators. When using accents, pair them with high-saturation semi-transparent overlays (e.g., a 10% opacity glow) to create a sense of light and energy.

## Typography

This design system utilizes **Source Sans 3** (the Latin counterpart to Source Han Sans / 思源黑体) to ensure a seamless multi-language experience. The scaling is dynamic and bold, emphasizing hierarchy through weight rather than just size.

- **Headlines:** Use ExtraBold or Black weights (800-900) to create "journal header" vibes.
- **Body:** Kept clean and legible with generous line heights to ensure a "relaxed" reading experience.
- **Labels:** Use bold weights and slight letter spacing for button text and tags to distinguish them from editorial content.
- **CJK Fallback:** For Chinese characters, default to **Source Han Sans (思源黑体)** maintaining the same weight hierarchy.

## Layout & Spacing

The layout is **Desktop-first**, utilizing a structured 12-column fixed grid that feels organized yet flexible. 

- **Grid:** A 1280px max-width container with 24px gutters. 
- **Rhythm:** An 8px base unit drives all padding and margins. 
- **White Space:** While not "Zen," whitespace is used intentionally to separate "sticker" groups and sections.
- **The "Stack" Logic:** Elements are grouped in logical stacks. Use `stack-lg` (32px) to separate distinct "journal entries" or sections, and `stack-sm` (8px) for internal component spacing.

## Elevation & Depth

Depth in this design system is achieved through **Color and Glow** rather than traditional grey shadows.

- **Sticker Layers:** Elements should feel like they are placed *on* the paper. Instead of blurred shadows, use thin, high-contrast borders (#302E2E at 10% opacity) or solid offsets (1px shift) to define edges.
- **Active Glows:** Use semi-transparent, highly saturated blurs of the accent colors behind active elements. For example, a "running" task might have a soft 15px Teal blur behind it.
- **Tonal Stacking:** Use slight variations of the base color (e.g., #FAF8F3) for container backgrounds to create a subtle layered paper effect.

## Shapes

The shape language is dominated by **Pill-shaped (Full Rounded)** geometry. This removes the "sharpness" of digital interfaces and replaces it with a friendly, organic feel.

- **Primary Components:** Buttons, search bars, and tags must always use maximum roundedness (Pill-shaped).
- **Containers:** Large cards and modals should use `rounded-xl` (1.5rem / 24px) to maintain the soft aesthetic without looking like a circle.
- **Icons:** Icons should feature rounded caps and corners, avoiding any sharp 90-degree angles.

## Components

### Buttons & Inputs
- **Primary Button:** Pill-shaped, #302E2E background with #F4EFE4 text. On hover, apply a soft glow using an accent color.
- **Secondary Button:** Ghost style with a 2px stroke of #302E2E.
- **Input Fields:** Semi-transparent background (5% black over #F4EFE4) with a pill-shaped border. Text should feel "written" into the field.

### Cards & Stickers
- **Content Cards:** Use a white or slightly lighter off-white background with a 1px soft border. No shadow.
- **Sticker Chips:** Small, pill-shaped tags using the 12-color accent palette. These should look like labels stuck onto the page. Use bold, small-caps or heavy weight typography.

### Lists & Interaction
- **Lists:** Use horizontal dividers with a "hand-drawn" or textured feel (dotted or dashed #929185).
- **Checkboxes:** Rounded squares that transform into a solid accent color pill when checked.
- **Playful Icons:** Icons should be slightly larger than standard (24px default) and use a consistent stroke weight that matches the typography's "Medium" weight.