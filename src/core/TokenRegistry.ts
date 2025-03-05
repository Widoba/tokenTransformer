/**
 * Token Registry to parse and manage design tokens
 */

import fs from 'fs/promises';
import path from 'path';
import { 
  TokenRegistryOptions, 
  DesignToken, 
  ColorToken, 
  TypographyToken, 
  SpacingToken,
  BorderRadiusToken,
  ShadowToken,
  TokenCategory,
  TokenMatch,
  TokenMatchOptions
} from './types.js';
import { parseColor, calculateColorDistance } from '../utils/colorUtils.js';

/**
 * Registry for design tokens
 * Parses and manages design tokens from CSS variables
 */
export class TokenRegistry {
  private colorTokens: ColorToken[] = [];
  private typographyTokens: TypographyToken[] = [];
  private spacingTokens: SpacingToken[] = [];
  private borderRadiusTokens: BorderRadiusToken[] = [];
  private shadowTokens: ShadowToken[] = [];
  private cssVars: Map<string, string> = new Map();
  private initialized = false;

  /**
   * Create a new TokenRegistry
   * @param options Options for token registry initialization
   */
  constructor(private options: TokenRegistryOptions = {}) {}

  /**
   * Initialize the token registry
   * Loads tokens from CSS file or content
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    let cssContent = '';
    
    // Load CSS from file if path is provided
    if (this.options.cssPath) {
      try {
        cssContent = await fs.readFile(this.options.cssPath, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to read CSS file: ${(error as Error).message}`);
      }
    } 
    // Use provided CSS content
    else if (this.options.cssContent) {
      cssContent = this.options.cssContent;
    }
    // Throw error if no source is provided
    else {
      throw new Error('No CSS source provided. Specify cssPath or cssContent.');
    }
    
    // Parse CSS variables
    this.parseCssVariables(cssContent);
    
    // Create token objects from CSS variables
    this.createTokens();
    
    this.initialized = true;
  }
  
  /**
   * Parse CSS variables from CSS content
   * @param cssContent CSS content with variable definitions
   */
  private parseCssVariables(cssContent: string): void {
    // Find all CSS variable declarations
    const variableRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let match;
    
    while ((match = variableRegex.exec(cssContent)) !== null) {
      const name = match[1].trim();
      const value = match[2].trim();
      this.cssVars.set(`--${name}`, value);
    }
  }
  
  /**
   * Create typed token objects from CSS variables
   */
  private createTokens(): void {
    for (const [cssVariable, value] of this.cssVars.entries()) {
      // Skip variable references (var(--...)) for now
      if (value.startsWith('var(')) {
        continue;
      }
      
      const name = this.getNameFromCssVariable(cssVariable);
      
      // Categorize and create appropriate token object
      if (this.isColorValue(value)) {
        this.createColorToken(name, cssVariable, value);
      } else if (cssVariable.includes('spacing')) {
        this.createSpacingToken(name, cssVariable, value);
      } else if (cssVariable.includes('border-radius')) {
        this.createBorderRadiusToken(name, cssVariable, value);
      } else if (cssVariable.includes('shadow')) {
        this.createShadowToken(name, cssVariable, value);
      } else if (this.isTypographyProperty(cssVariable)) {
        this.createOrUpdateTypographyToken(name, cssVariable, value);
      }
    }
  }
  
  /**
   * Get a friendly name from a CSS variable
   * @param cssVariable CSS variable (e.g., --color-primary)
   * @returns Friendly name (e.g., primary)
   */
  private getNameFromCssVariable(cssVariable: string): string {
    // Remove the leading --
    let name = cssVariable.replace(/^--/, '');
    
    // Remove category prefixes
    name = name.replace(/^(color-|font-|spacing-|border-radius-|shadow-)/, '');
    
    return name;
  }
  
  /**
   * Check if a value appears to be a color
   * @param value CSS value to check
   * @returns True if the value is likely a color
   */
  private isColorValue(value: string): boolean {
    const colorFormats = [
      /^#[0-9a-fA-F]{3,8}$/,         // Hex colors
      /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,  // RGB
      /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/,  // RGBA
      /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/,  // HSL
      /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/,  // HSLA
      /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*\)$/  // OKLCH
    ];
    
    return colorFormats.some(regex => regex.test(value.trim()));
  }
  
  /**
   * Check if a CSS variable is typography-related
   * @param cssVariable CSS variable name
   * @returns True if the variable is typography-related
   */
  private isTypographyProperty(cssVariable: string): boolean {
    const typographyProps = [
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'letter-spacing',
      'text-'
    ];
    
    return typographyProps.some(prop => cssVariable.includes(prop));
  }
  
  /**
   * Create a color token from CSS variable
   * @param name Token name
   * @param cssVariable CSS variable name
   * @param value Color value
   */
  private createColorToken(name: string, cssVariable: string, value: string): void {
    try {
      // Parse the color value
      const colorFormats = parseColor(value);
      
      const token: ColorToken = {
        name,
        cssVariable,
        category: 'color',
        originalValue: value,
        value: {
          hex: colorFormats.hex,
          rgb: colorFormats.rgb,
          hsl: colorFormats.hsl,
          oklch: colorFormats.oklch
        }
      };
      
      // Add tailwind class if we can infer it
      if (cssVariable.startsWith('--color-')) {
        token.tailwindClass = `text-${name}`;
      }
      
      this.colorTokens.push(token);
    } catch (error) {
      console.warn(`Failed to parse color token ${cssVariable}: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create or update a typography token from CSS variable
   * @param name Token name
   * @param cssVariable CSS variable name
   * @param value Typography value
   */
  private createOrUpdateTypographyToken(name: string, cssVariable: string, value: string): void {
    // Extract the base name without the property
    const baseName = name.replace(/-font-(family|size|weight|style)$|-line-height$|-letter-spacing$/, '');
    
    // Find existing token or create new one
    let token = this.typographyTokens.find(t => t.name === baseName);
    
    if (!token) {
      token = {
        name: baseName,
        cssVariable: `--${baseName}`,
        category: 'typography',
        value: {}
      };
      this.typographyTokens.push(token);
    }
    
    // Update the appropriate property
    if (cssVariable.includes('font-family')) {
      token.value.fontFamily = value;
    } else if (cssVariable.includes('font-size')) {
      token.value.fontSize = value;
    } else if (cssVariable.includes('font-weight')) {
      token.value.fontWeight = isNaN(Number(value)) ? value : Number(value);
    } else if (cssVariable.includes('line-height')) {
      token.value.lineHeight = isNaN(Number(value)) ? value : Number(value);
    } else if (cssVariable.includes('letter-spacing')) {
      token.value.letterSpacing = value;
    }
  }
  
  /**
   * Create a spacing token from CSS variable
   * @param name Token name
   * @param cssVariable CSS variable name
   * @param value Spacing value
   */
  private createSpacingToken(name: string, cssVariable: string, value: string): void {
    const token: SpacingToken = {
      name,
      cssVariable,
      category: 'spacing',
      value
    };
    
    // Add tailwind class if possible
    if (cssVariable.startsWith('--spacing-')) {
      token.tailwindClass = `p-${name}`;
    }
    
    this.spacingTokens.push(token);
  }
  
  /**
   * Create a border radius token from CSS variable
   * @param name Token name
   * @param cssVariable CSS variable name
   * @param value Border radius value
   */
  private createBorderRadiusToken(name: string, cssVariable: string, value: string): void {
    const token: BorderRadiusToken = {
      name,
      cssVariable,
      category: 'borderRadius',
      value
    };
    
    // Add tailwind class if possible
    if (cssVariable.startsWith('--border-radius-')) {
      token.tailwindClass = `rounded-${name}`;
    }
    
    this.borderRadiusTokens.push(token);
  }
  
  /**
   * Create a shadow token from CSS variable
   * @param name Token name
   * @param cssVariable CSS variable name
   * @param value Shadow value
   */
  private createShadowToken(name: string, cssVariable: string, value: string): void {
    const token: ShadowToken = {
      name,
      cssVariable,
      category: 'shadow',
      value
    };
    
    // Try to parse shadow components
    try {
      token.components = this.parseShadowComponents(value);
    } catch (error) {
      // Skip component parsing if it fails
    }
    
    // Add tailwind class if possible
    if (cssVariable.startsWith('--shadow-')) {
      token.tailwindClass = `shadow-${name}`;
    }
    
    this.shadowTokens.push(token);
  }
  
  /**
   * Parse shadow components from box-shadow value
   * @param shadowValue Box-shadow CSS value
   * @returns Array of shadow component objects
   */
  private parseShadowComponents(shadowValue: string): Array<{
    x: string;
    y: string;
    blur: string;
    spread: string;
    color: string;
    inset?: boolean;
  }> {
    // Split multiple shadows (separated by commas)
    const shadowParts = shadowValue.split(/,(?![^(]*\))/);
    
    return shadowParts.map(part => {
      const components = part.trim().split(/\s+/);
      const hasInset = components[0] === 'inset';
      
      // Adjust indices based on whether inset is present
      let startIndex = hasInset ? 1 : 0;
      
      return {
        inset: hasInset,
        x: components[startIndex],
        y: components[startIndex + 1],
        blur: components[startIndex + 2] || '0',
        spread: components[startIndex + 3] || '0',
        color: components.slice(startIndex + 4).join(' ') || 'currentColor'
      };
    });
  }
  
  /**
   * Get all tokens of a specific category
   * @param category Token category
   * @returns Array of tokens of the specified category
   */
  getTokensByCategory(category: TokenCategory): DesignToken[] {
    switch (category) {
      case 'color':
        return [...this.colorTokens];
      case 'typography':
        return [...this.typographyTokens];
      case 'spacing':
        return [...this.spacingTokens];
      case 'borderRadius':
        return [...this.borderRadiusTokens];
      case 'shadow':
        return [...this.shadowTokens];
      default:
        return [];
    }
  }
  
  /**
   * Get all tokens
   * @returns Array of all tokens
   */
  getAllTokens(): DesignToken[] {
    return [
      ...this.colorTokens,
      ...this.typographyTokens,
      ...this.spacingTokens,
      ...this.borderRadiusTokens,
      ...this.shadowTokens
    ];
  }
  
  /**
   * Find a token by name
   * @param name Token name
   * @returns Token with the specified name, or undefined if not found
   */
  findTokenByName(name: string): DesignToken | undefined {
    return this.getAllTokens().find(token => 
      token.name === name || 
      token.cssVariable === name ||
      token.cssVariable === `--${name}` ||
      token.tailwindClass === name
    );
  }
  
  /**
   * Find tokens by CSS variable
   * @param cssVariable CSS variable name
   * @returns Token with the specified CSS variable, or undefined if not found
   */
  findTokenByCssVariable(cssVariable: string): DesignToken | undefined {
    return this.getAllTokens().find(token => token.cssVariable === cssVariable);
  }
  
  /**
   * Find the closest color token match for a given color value
   * @param colorValue Color value to match (hex, rgb, etc.)
   * @param options Matching options
   * @returns Token match with confidence score
   */
  findClosestColorMatch(colorValue: string, options: TokenMatchOptions = {}): TokenMatch | null {
    if (!this.initialized) {
      throw new Error('TokenRegistry not initialized. Call initialize() first.');
    }
    
    try {
      // Parse the color to match
      const targetColor = parseColor(colorValue);
      
      // Default threshold
      const threshold = options.threshold ?? 0.85;
      
      // Get all color tokens
      const colorTokens = this.colorTokens;
      
      // Find exact match first
      const exactMatch = colorTokens.find(token => 
        token.value.hex.toLowerCase() === targetColor.hex.toLowerCase()
      );
      
      if (exactMatch) {
        return {
          token: exactMatch,
          confidence: 1,
          originalValue: colorValue
        };
      }
      
      // If exact match is required but not found, return null
      if (options.exact) {
        return null;
      }
      
      // Calculate distances to find the closest match
      let closestToken: ColorToken | null = null;
      let smallestDistance = Infinity;
      
      for (const token of colorTokens) {
        const distance = calculateColorDistance(
          targetColor.rgb,
          token.value.rgb
        );
        
        if (distance < smallestDistance) {
          smallestDistance = distance;
          closestToken = token;
        }
      }
      
      // Convert distance to confidence (1 - normalized distance)
      const confidence = 1 - smallestDistance;
      
      // Return match if confidence meets threshold
      if (closestToken && confidence >= threshold) {
        return {
          token: closestToken,
          confidence,
          originalValue: colorValue
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to find color match for ${colorValue}: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Find the best matching token for a given value
   * @param value Value to match
   * @param category Optional category to limit search
   * @param options Matching options
   * @returns Best token match with confidence score
   */
  findBestMatch(
    value: string, 
    category?: TokenCategory,
    options: TokenMatchOptions = {}
  ): TokenMatch | null {
    if (!this.initialized) {
      throw new Error('TokenRegistry not initialized. Call initialize() first.');
    }
    
    // If category is color or unspecified, try color matching
    if (!category || category === 'color') {
      if (this.isColorValue(value)) {
        const colorMatch = this.findClosestColorMatch(value, options);
        if (colorMatch) {
          return colorMatch;
        }
      }
    }
    
    // If category is spacing or unspecified, try exact spacing matching
    if (!category || category === 'spacing') {
      const spacingMatch = this.spacingTokens.find(token => token.value === value);
      if (spacingMatch) {
        return {
          token: spacingMatch,
          confidence: 1,
          originalValue: value
        };
      }
    }
    
    // If category is borderRadius or unspecified, try exact border radius matching
    if (!category || category === 'borderRadius') {
      const radiusMatch = this.borderRadiusTokens.find(token => token.value === value);
      if (radiusMatch) {
        return {
          token: radiusMatch,
          confidence: 1,
          originalValue: value
        };
      }
    }
    
    // If category is shadow or unspecified, try shadow matching
    if (!category || category === 'shadow') {
      // Exact shadow matching (shadows are complex, so only doing exact for now)
      const shadowMatch = this.shadowTokens.find(token => token.value === value);
      if (shadowMatch) {
        return {
          token: shadowMatch,
          confidence: 1,
          originalValue: value
        };
      }
    }
    
    // If we reach here, no match was found
    return null;
  }
  
  /**
   * Export all tokens to a JSON file
   * @param filePath Path to export JSON
   */
  async exportTokensToJson(filePath: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('TokenRegistry not initialized. Call initialize() first.');
    }
    
    const tokens = this.getAllTokens();
    
    try {
      const jsonContent = JSON.stringify(tokens, null, 2);
      await fs.writeFile(filePath, jsonContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to export tokens to JSON: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get count of tokens by category
   */
  getTokenCounts(): Record<TokenCategory, number> {
    return {
      color: this.colorTokens.length,
      typography: this.typographyTokens.length,
      spacing: this.spacingTokens.length,
      borderRadius: this.borderRadiusTokens.length,
      shadow: this.shadowTokens.length
    };
  }
}