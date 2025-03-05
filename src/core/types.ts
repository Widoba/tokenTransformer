/**
 * Core type definitions for the token transformer
 */

/**
 * Supported token categories
 */
export type TokenCategory = 'color' | 'typography' | 'spacing' | 'borderRadius' | 'shadow';

/**
 * Base interface for all token types
 */
export interface BaseToken {
  /** Token identifier */
  name: string;
  
  /** CSS variable reference (e.g., `--color-primary`) */
  cssVariable: string;
  
  /** Optional Tailwind class equivalent */
  tailwindClass?: string;
  
  /** Optional description of the token's purpose */
  description?: string;
  
  /** Token category */
  category: TokenCategory;
}

/**
 * Color token with multiple format representations
 */
export interface ColorToken extends BaseToken {
  category: 'color';
  
  /** Original color value from the token definition */
  originalValue: string;
  
  /** Normalized color formats */
  value: {
    /** Hex color code (e.g., #FF5500) */
    hex: string;
    
    /** RGB color values */
    rgb: {
      r: number;
      g: number;
      b: number;
      a?: number;
    };
    
    /** HSL color values */
    hsl?: {
      h: number;
      s: number;
      l: number;
      a?: number;
    };
    
    /** OKLCH color values (if available) */
    oklch?: {
      l: number;
      c: number;
      h: number;
      a?: number;
    };
  };
}

/**
 * Typography token with font properties
 */
export interface TypographyToken extends BaseToken {
  category: 'typography';
  value: {
    /** Font family (e.g., "Open Sans", sans-serif) */
    fontFamily?: string;
    
    /** Font size with unit (e.g., "1rem", "16px") */
    fontSize?: string;
    
    /** Font weight (e.g., 400, 600, "bold") */
    fontWeight?: string | number;
    
    /** Line height with or without unit (e.g., 1.5, "1.5rem") */
    lineHeight?: string | number;
    
    /** Letter spacing (e.g., "0.5px", "normal") */
    letterSpacing?: string;
  };
}

/**
 * Spacing token for margins, paddings, etc.
 */
export interface SpacingToken extends BaseToken {
  category: 'spacing';
  
  /** Spacing value with unit (e.g., "1rem", "16px") */
  value: string;
}

/**
 * Border radius token
 */
export interface BorderRadiusToken extends BaseToken {
  category: 'borderRadius';
  
  /** Border radius value with unit (e.g., "4px", "0.25rem") */
  value: string;
}

/**
 * Shadow token
 */
export interface ShadowToken extends BaseToken {
  category: 'shadow';
  
  /** Shadow value as CSS box-shadow */
  value: string;
  
  /** Parsed shadow components (if available) */
  components?: Array<{
    x: string;
    y: string;
    blur: string;
    spread: string;
    color: string;
    inset?: boolean;
  }>;
}

/**
 * Union type of all token types
 */
export type DesignToken = 
  | ColorToken 
  | TypographyToken 
  | SpacingToken
  | BorderRadiusToken 
  | ShadowToken;

/**
 * Token match result with confidence score
 */
export interface TokenMatch {
  /** The matched design token */
  token: DesignToken;
  
  /** Confidence score (0-1) of the match quality */
  confidence: number;
  
  /** The original value that was matched */
  originalValue: string;
}

/**
 * Options for token matching
 */
export interface TokenMatchOptions {
  /** Minimum confidence threshold (0-1) */
  threshold?: number;
  
  /** Limit search to specific categories */
  categories?: TokenCategory[];
  
  /** Whether to require exact matches only */
  exact?: boolean;
}

/**
 * Token transformation result
 */
export interface TransformationResult {
  /** Original code or value */
  original: string;
  
  /** Transformed code with token reference */
  transformed: string;
  
  /** The token that was used for transformation */
  token: DesignToken;
  
  /** Confidence level of the transformation */
  confidence: number;
}

/**
 * Token registry options
 */
export interface TokenRegistryOptions {
  /** Path to CSS file with token definitions */
  cssPath?: string;
  
  /** Raw CSS content with token definitions */
  cssContent?: string;
  
  /** Whether to convert colors to multiple formats */
  normalizeColors?: boolean;
}