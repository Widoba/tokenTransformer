/**
 * Matcher for inline styles in React components
 */

import {
  MatchResult,
  MatchType,
  MatcherOptions,
  PatternMatcher,
  CSS_PROPERTY_CATEGORIES,
  createMatchLocation,
  getFullLine
} from './types.js';

/**
 * Style property regex patterns for different types
 */
const PROPERTY_TYPE_PATTERNS: Record<MatchType, RegExp> = {
  color: /#[0-9a-fA-F]{3,8}|rgba?\s*\([^)]+\)|hsla?\s*\([^)]+\)|oklch\s*\([^)]+\)/,
  spacing: /-?\d*\.?\d+(px|rem|em|%|vh|vw)/,
  borderRadius: /\d*\.?\d+(px|rem|em|%)/,
  shadow: /\d+px\s+\d+px(\s+\d+px)?(\s+\d+px)?(\s+rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})?/,
  typography: /\d*\.?\d+(px|rem|em|%)|normal|bold|lighter|bolder|\d{3}|inherit|initial/
};

/**
 * Pattern matcher for inline styles in React components
 * Identifies style patterns like style={{ color: '#ff0000' }}
 */
export class InlineStyleMatcher implements PatternMatcher {
  /**
   * Get the name of this matcher
   */
  getName(): string {
    return 'InlineStyleMatcher';
  }
  
  /**
   * Match inline styles in React components
   * @param source Source code to search
   * @param options Matching options
   * @returns Array of matches
   */
  match(source: string, options: MatcherOptions = {}): MatchResult[] {
    const results: MatchResult[] = [];
    const { types = ['color', 'spacing', 'borderRadius', 'shadow', 'typography'] } = options;
    
    // Skip if style is not in the scope limit
    if (options.scopeLimit && !options.scopeLimit.includes('style')) {
      return results;
    }
    
    // Regex to find style object props in JSX
    const styleObjectRegex = /style\s*=\s*{(\s*{[^{}]*}|\s*{(?:{[^{}]*}|[^{}])*})\s*}/gs;
    
    // Find all style props
    let styleMatch;
    while ((styleMatch = styleObjectRegex.exec(source)) !== null) {
      const styleObjStr = styleMatch[1];
      
      // Extract the JSX element containing this style
      const elementMatch = this.findEnclosingElement(source, styleMatch.index);
      const element = elementMatch ? elementMatch[1] : undefined;
      
      // Parse the style object string to find property:value pairs
      this.processStyleObject(
        styleObjStr,
        styleMatch.index,
        source,
        types,
        element,
        results
      );
    }
    
    // Also look for object style variables being spread into style prop
    const styleSpreadRegex = /style\s*=\s*{([a-zA-Z0-9_]+)}/g;
    
    while ((styleMatch = styleSpreadRegex.exec(source)) !== null) {
      const variableName = styleMatch[1];
      
      // Try to find the variable definition
      const varDefRegex = new RegExp(`(const|let|var)\\s+${variableName}\\s*=\\s*({[^;]+})`, 'g');
      const varDefMatch = varDefRegex.exec(source);
      
      if (varDefMatch) {
        const styleObjStr = varDefMatch[2];
        const elementMatch = this.findEnclosingElement(source, styleMatch.index);
        const element = elementMatch ? elementMatch[1] : undefined;
        
        this.processStyleObject(
          styleObjStr,
          varDefMatch.index + varDefMatch[0].indexOf(styleObjStr),
          source,
          types,
          element,
          results,
          [variableName]
        );
      }
    }
    
    return results;
  }
  
  /**
   * Process a style object string to extract style properties
   * @param styleObjStr Style object string
   * @param baseIndex Base index in the source
   * @param source Original source code
   * @param types Types of values to match
   * @param element Element name
   * @param results Results array to append to
   * @param pathPrefix Optional path prefix (for variable references)
   */
  private processStyleObject(
    styleObjStr: string,
    baseIndex: number,
    source: string,
    types: MatchType[],
    element: string | undefined,
    results: MatchResult[],
    pathPrefix: string[] = []
  ): void {
    // Remove the outer braces if they exist
    let objContent = styleObjStr.trim();
    if (objContent.startsWith('{') && objContent.endsWith('}')) {
      objContent = objContent.slice(1, -1).trim();
    }
    
    // Extract property:value pairs using a more sophisticated regex
    // This handles commas, quotes, and nested values properly
    const propertyRegex = /([A-Za-z0-9_]+)\s*:\s*(['"`]?(.*?)['"`]?)(,|$)/g;
    
    let propMatch;
    while ((propMatch = propertyRegex.exec(objContent)) !== null) {
      const property = propMatch[1];
      const value = propMatch[3].trim();
      
      // Skip if empty value or not a CSS property we're interested in
      if (!value || !CSS_PROPERTY_CATEGORIES[property]) {
        continue;
      }
      
      const type = CSS_PROPERTY_CATEGORIES[property];
      
      // Skip if type is not in requested types
      if (!types.includes(type)) {
        continue;
      }
      
      // Check if the value matches the expected pattern for this type
      if (!this.isValueMatchingType(value, type)) {
        continue;
      }
      
      // Calculate position in source
      const propIndex = baseIndex + styleObjStr.indexOf(property);
      const valueIndex = propIndex + property.length + styleObjStr.substring(
        styleObjStr.indexOf(property),
        styleObjStr.indexOf(value, styleObjStr.indexOf(property))
      ).length;
      
      // Create match result
      const result: MatchResult = {
        type,
        value,
        property,
        scope: 'style',
        context: {
          line: getFullLine(source, valueIndex),
          element
        },
        location: createMatchLocation(source, valueIndex, valueIndex + value.length),
        path: [...pathPrefix, 'style', property]
      };
      
      results.push(result);
    }
  }
  
  /**
   * Find the enclosing JSX element for a style prop
   * @param source Source code
   * @param styleIndex Index of the style prop
   * @returns Match result with element name
   */
  private findEnclosingElement(source: string, styleIndex: number): RegExpExecArray | null {
    // Find the start of the line
    const lineStart = source.lastIndexOf('\n', styleIndex) + 1;
    
    // Extract the line up to the style index
    const linePrefix = source.substring(lineStart, styleIndex);
    
    // Try to find the enclosing element with a basic regex
    // This is not perfect but works for common cases
    const elementRegex = /<([A-Za-z0-9_$]+)/;
    return elementRegex.exec(linePrefix);
  }
  
  /**
   * Check if a value matches the expected pattern for a type
   * @param value Value to check
   * @param type Type to check against
   * @returns True if the value matches the type pattern
   */
  private isValueMatchingType(value: string, type: MatchType): boolean {
    const pattern = PROPERTY_TYPE_PATTERNS[type];
    return pattern.test(value);
  }
}