/**
 * Matcher for Tailwind CSS arbitrary value classes
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
 * Maps Tailwind prefixes to CSS properties and match types
 */
const TAILWIND_PREFIX_MAP: Record<string, { property: string; type: MatchType }> = {
  // Colors
  'bg-': { property: 'backgroundColor', type: 'color' },
  'text-': { property: 'color', type: 'color' },
  'border-': { property: 'borderColor', type: 'color' },
  'border-t-': { property: 'borderTopColor', type: 'color' },
  'border-b-': { property: 'borderBottomColor', type: 'color' },
  'border-l-': { property: 'borderLeftColor', type: 'color' },
  'border-r-': { property: 'borderRightColor', type: 'color' },
  'outline-': { property: 'outlineColor', type: 'color' },
  'fill-': { property: 'fill', type: 'color' },
  'stroke-': { property: 'stroke', type: 'color' },
  'from-': { property: 'gradientColorFrom', type: 'color' },
  'to-': { property: 'gradientColorTo', type: 'color' },
  'via-': { property: 'gradientColorVia', type: 'color' },
  
  // Border Radius
  'rounded-': { property: 'borderRadius', type: 'borderRadius' },
  'rounded-t-': { property: 'borderTopRadius', type: 'borderRadius' },
  'rounded-b-': { property: 'borderBottomRadius', type: 'borderRadius' },
  'rounded-l-': { property: 'borderLeftRadius', type: 'borderRadius' },
  'rounded-r-': { property: 'borderRightRadius', type: 'borderRadius' },
  'rounded-tl-': { property: 'borderTopLeftRadius', type: 'borderRadius' },
  'rounded-tr-': { property: 'borderTopRightRadius', type: 'borderRadius' },
  'rounded-bl-': { property: 'borderBottomLeftRadius', type: 'borderRadius' },
  'rounded-br-': { property: 'borderBottomRightRadius', type: 'borderRadius' },
  
  // Shadows
  'shadow-': { property: 'boxShadow', type: 'shadow' },
  
  // Spacing
  'm-': { property: 'margin', type: 'spacing' },
  'mt-': { property: 'marginTop', type: 'spacing' },
  'mr-': { property: 'marginRight', type: 'spacing' },
  'mb-': { property: 'marginBottom', type: 'spacing' },
  'ml-': { property: 'marginLeft', type: 'spacing' },
  'mx-': { property: 'marginHorizontal', type: 'spacing' },
  'my-': { property: 'marginVertical', type: 'spacing' },
  'p-': { property: 'padding', type: 'spacing' },
  'pt-': { property: 'paddingTop', type: 'spacing' },
  'pr-': { property: 'paddingRight', type: 'spacing' },
  'pb-': { property: 'paddingBottom', type: 'spacing' },
  'pl-': { property: 'paddingLeft', type: 'spacing' },
  'px-': { property: 'paddingHorizontal', type: 'spacing' },
  'py-': { property: 'paddingVertical', type: 'spacing' },
  'gap-': { property: 'gap', type: 'spacing' },
  'gap-x-': { property: 'columnGap', type: 'spacing' },
  'gap-y-': { property: 'rowGap', type: 'spacing' },
  'space-x-': { property: 'spaceX', type: 'spacing' },
  'space-y-': { property: 'spaceY', type: 'spacing' },
  
  // Typography
  'text-': { property: 'fontSize', type: 'typography' },
  'font-': { property: 'fontWeight', type: 'typography' },
  'leading-': { property: 'lineHeight', type: 'typography' },
  'tracking-': { property: 'letterSpacing', type: 'typography' },
};

/**
 * Pattern matcher for Tailwind CSS arbitrary value classes
 * Identifies arbitrary value classes like bg-[#25C9D0] or text-[16px]
 */
export class TailwindClassMatcher implements PatternMatcher {
  // Regex to match Tailwind arbitrary value classes
  private readonly arbitraryValueRegex = /\b([a-z]+-[a-z]*-?)\[(.*?)\]/g;
  
  /**
   * Get the name of this matcher
   */
  getName(): string {
    return 'TailwindClassMatcher';
  }
  
  /**
   * Match Tailwind arbitrary value classes in source code
   * @param source Source code to search
   * @param options Matching options
   * @returns Array of matches
   */
  match(source: string, options: MatcherOptions = {}): MatchResult[] {
    const results: MatchResult[] = [];
    const { types = ['color', 'spacing', 'borderRadius', 'shadow', 'typography'] } = options;
    
    // Determine whether to scan for className props or all string literals
    const classNamePropRegex = /className\s*=\s*(?:{(?:`|"|')(.*?)(?:`|"|')}|"(.*?)"|'(.*?)')/g;
    
    // Find className props in JSX to limit search scope if possible
    let classNameMatches: Array<{ value: string; start: number; end: number }> = [];
    let match;
    
    while ((match = classNamePropRegex.exec(source)) !== null) {
      const value = match[1] || match[2] || match[3] || '';
      const start = match.index;
      const end = start + match[0].length;
      
      classNameMatches.push({ value, start, end });
    }
    
    // If no className props found, scan entire source for possible Tailwind classes
    if (classNameMatches.length === 0) {
      // Look for arbitrary value Tailwind patterns in string literals
      const stringLiteralRegex = /"(.*?)"|'(.*?)'|`(.*?)`/gs;
      while ((match = stringLiteralRegex.exec(source)) !== null) {
        const value = match[1] || match[2] || match[3] || '';
        const start = match.index;
        const end = start + match[0].length;
        
        classNameMatches.push({ value, start, end });
      }
    }
    
    // Process each className value
    for (const classNameMatch of classNameMatches) {
      const classNameValue = classNameMatch.value;
      
      // Reset the lastIndex to start search from beginning of the string
      this.arbitraryValueRegex.lastIndex = 0;
      
      // Find arbitrary value classes within the className
      let arbitraryMatch;
      while ((arbitraryMatch = this.arbitraryValueRegex.exec(classNameValue)) !== null) {
        const prefix = arbitraryMatch[1]; // e.g., "bg-", "text-"
        const value = arbitraryMatch[2];  // value inside brackets
        
        // Skip if no mapping exists for this prefix
        if (!TAILWIND_PREFIX_MAP[prefix]) {
          continue;
        }
        
        const { property, type } = TAILWIND_PREFIX_MAP[prefix];
        
        // Skip if the type is not in the requested types
        if (!types.includes(type)) {
          continue;
        }
        
        // Calculate position in original source
        const valueStart = classNameMatch.start + arbitraryMatch.index + prefix.length + 1; // +1 for the [
        const valueEnd = valueStart + value.length;
        
        // Create match result
        const result: MatchResult = {
          type,
          value,
          property,
          scope: 'className',
          context: {
            line: getFullLine(source, valueStart)
          },
          location: createMatchLocation(source, valueStart, valueEnd),
          path: ['className', prefix + '[' + value + ']']
        };
        
        // Attempt to extract element name
        const elementRegex = /<([A-Za-z0-9]+)[^>]*className\s*=\s*(?:{(?:`|"|')|\"|')(.*?)(?:`|"|')}|"|')/;
        const lineContext = result.context.line;
        const elementMatch = lineContext.match(elementRegex);
        
        if (elementMatch) {
          result.context.element = elementMatch[1];
        }
        
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Determine if a value is likely a particular type
   * @param value The value to check
   * @param type The type to check for
   * @returns True if the value matches the type pattern
   */
  private isLikelyType(value: string, type: MatchType): boolean {
    switch (type) {
      case 'color':
        // Match hex, rgb, rgba, hsl, etc.
        return /^#[0-9a-fA-F]{3,8}$|^rgba?\(|^hsla?\(|^oklch\(/.test(value);
        
      case 'spacing':
        // Match px, rem, em, %, etc.
        return /^-?(\d*\.)?\d+(px|rem|em|%|vh|vw)$/.test(value);
        
      case 'borderRadius':
        // Match px, rem, em, % for border radius
        return /^(\d*\.)?\d+(px|rem|em|%)$/.test(value);
        
      case 'shadow':
        // Match complex shadow patterns with px values and colors
        return /\d+px/.test(value) && /rgba?\(|#[0-9a-fA-F]/.test(value);
        
      case 'typography':
        // Match font sizes, weights, etc.
        return /^(\d*\.)?\d+(px|rem|em|%)$|^(normal|bold|light|medium)$/.test(value);
        
      default:
        return false;
    }
  }
}