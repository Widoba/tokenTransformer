/**
 * Tests for TokenRegistry
 */

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { TokenRegistry } from '../../src/core/TokenRegistry.js';
import { ColorToken, SpacingToken, BorderRadiusToken } from '../../src/core/types.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the tokens.css file
const tokensPath = path.resolve(__dirname, '../fixtures/tokens.css');

describe('TokenRegistry', () => {
  let registry: TokenRegistry;

  // Initialize the registry before all tests
  beforeAll(async () => {
    registry = new TokenRegistry({
      cssPath: tokensPath,
      normalizeColors: true
    });
    await registry.initialize();
  });

  describe('Initialization', () => {
    it('should parse CSS variables from file', () => {
      const tokenCounts = registry.getTokenCounts();
      
      // Verify we have tokens in each category
      expect(tokenCounts.color).toBeGreaterThan(0);
      expect(tokenCounts.typography).toBeGreaterThan(0);
      expect(tokenCounts.spacing).toBeGreaterThan(0);
      expect(tokenCounts.borderRadius).toBeGreaterThan(0);
      
      // Total tokens should be a reasonable number based on the CSS file
      const totalTokens = Object.values(tokenCounts).reduce((sum, count) => sum + count, 0);
      expect(totalTokens).toBeGreaterThan(20);
    });
  });

  describe('Color Tokens', () => {
    it('should correctly parse OKLCH colors', () => {
      const colorTokens = registry.getTokensByCategory('color') as ColorToken[];
      
      // Find the olivia-blue token which is in OKLCH format
      const oliviaBlue = colorTokens.find(token => token.name === 'olivia-blue');
      
      expect(oliviaBlue).toBeDefined();
      expect(oliviaBlue?.originalValue).toContain('oklch');
      
      // Verify we converted the OKLCH to other formats
      expect(oliviaBlue?.value.hex).toBeDefined();
      expect(oliviaBlue?.value.rgb).toBeDefined();
      expect(oliviaBlue?.value.rgb.r).toBeGreaterThanOrEqual(0);
      expect(oliviaBlue?.value.rgb.r).toBeLessThanOrEqual(255);
    });

    it('should find exact color matches', () => {
      // Test with a value that matches exactly to white
      const match = registry.findClosestColorMatch('oklch(1 0 0)');
      
      expect(match).toBeDefined();
      expect(match?.token.name).toBe('white');
      expect(match?.confidence).toBe(1);
    });

    it('should find approximate color matches', () => {
      // Test with a dark blue that should match close to olivia-blue-dark
      const match = registry.findClosestColorMatch('#105D7E');
      
      expect(match).toBeDefined();
      expect(match?.token.name).toContain('blue');
      expect(match?.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Typography Tokens', () => {
    it('should correctly parse typography tokens', () => {
      const typographyTokens = registry.getTokensByCategory('typography');
      
      // Verify we have typography tokens
      expect(typographyTokens.length).toBeGreaterThan(0);
      
      // Check a specific token structure
      const header1 = typographyTokens.find(token => token.name === 'header-1');
      expect(header1).toBeDefined();
      
      if (header1) {
        expect(header1.value).toHaveProperty('fontSize');
        expect(header1.value).toHaveProperty('lineHeight');
        expect(header1.value).toHaveProperty('fontWeight');
      }
    });
  });

  describe('Spacing Tokens', () => {
    it('should correctly parse spacing tokens', () => {
      const spacingTokens = registry.getTokensByCategory('spacing') as SpacingToken[];
      
      // Verify we have spacing tokens
      expect(spacingTokens.length).toBeGreaterThan(0);
      
      // Find a specific spacing token
      const spacingSm = spacingTokens.find(token => token.name === 'sm');
      
      expect(spacingSm).toBeDefined();
      expect(spacingSm?.value).toBe('1rem');
    });

    it('should find exact spacing matches', () => {
      const match = registry.findBestMatch('1rem');
      
      expect(match).toBeDefined();
      expect(match?.token.category).toBe('spacing');
      expect(match?.token.name).toBe('sm');
      expect(match?.confidence).toBe(1);
    });
  });

  describe('Border Radius Tokens', () => {
    it('should correctly parse border radius tokens', () => {
      const borderRadiusTokens = registry.getTokensByCategory('borderRadius') as BorderRadiusToken[];
      
      // Verify we have border radius tokens
      expect(borderRadiusTokens.length).toBeGreaterThan(0);
      
      // Find a specific border radius token
      const borderRadiusXs = borderRadiusTokens.find(token => token.name === 'xs');
      
      expect(borderRadiusXs).toBeDefined();
      expect(borderRadiusXs?.value).toBe('0.5rem');
    });
  });

  describe('Shadow Tokens', () => {
    it('should correctly parse shadow tokens', () => {
      const shadowTokens = registry.getTokensByCategory('shadow');
      
      // Verify we have shadow tokens
      expect(shadowTokens.length).toBeGreaterThan(0);
      
      // Check that a shadow token has the right structure
      if (shadowTokens.length > 0) {
        expect(shadowTokens[0]).toHaveProperty('value');
        expect(typeof shadowTokens[0].value).toBe('string');
      }
    });
  });

  describe('Token Lookup', () => {
    it('should find tokens by name', () => {
      const token = registry.findTokenByName('olivia-blue');
      
      expect(token).toBeDefined();
      expect(token?.name).toBe('olivia-blue');
      expect(token?.category).toBe('color');
    });

    it('should find tokens by CSS variable', () => {
      const token = registry.findTokenByCssVariable('--olivia-blue');
      
      expect(token).toBeDefined();
      expect(token?.name).toBe('olivia-blue');
      expect(token?.category).toBe('color');
    });

    it('should find best match across categories', () => {
      // Test with a border radius value
      const match = registry.findBestMatch('0.5rem');
      
      expect(match).toBeDefined();
      expect(['spacing', 'borderRadius']).toContain(match?.token.category);
      expect(match?.confidence).toBe(1);
    });
  });
});