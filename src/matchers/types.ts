/**
 * Types for the pattern matcher system
 */

/**
 * Types of values that can be matched
 */
export type MatchType = 'color' | 'spacing' | 'borderRadius' | 'shadow' | 'typography';

/**
 * CSS property category mapping
 */
export const CSS_PROPERTY_CATEGORIES: Record<string, MatchType> = {
  // Color properties
  color: 'color',
  backgroundColor: 'color',
  borderColor: 'color',
  fill: 'color',
  stroke: 'color',
  outlineColor: 'color',
  background: 'color', // May contain other values, but often is color
  
  // Spacing properties
  margin: 'spacing',
  marginTop: 'spacing',
  marginRight: 'spacing',
  marginBottom: 'spacing',
  marginLeft: 'spacing',
  padding: 'spacing',
  paddingTop: 'spacing',
  paddingRight: 'spacing',
  paddingBottom: 'spacing',
  paddingLeft: 'spacing',
  gap: 'spacing',
  columnGap: 'spacing',
  rowGap: 'spacing',
  
  // Border radius properties
  borderRadius: 'borderRadius',
  borderTopLeftRadius: 'borderRadius',
  borderTopRightRadius: 'borderRadius',
  borderBottomLeftRadius: 'borderRadius',
  borderBottomRightRadius: 'borderRadius',
  
  // Shadow properties
  boxShadow: 'shadow',
  textShadow: 'shadow',
  filter: 'shadow', // For drop-shadow()
  
  // Typography properties
  fontSize: 'typography',
  fontWeight: 'typography',
  lineHeight: 'typography',
  letterSpacing: 'typography',
  fontFamily: 'typography'
};

/**
 * Location information for a match
 */
export interface MatchLocation {
  /** Starting position in the source code */
  start: number;
  
  /** Ending position in the source code */
  end: number;
  
  /** Line number where the match starts */
  line: number;
  
  /** Column number where the match starts */
  column: number;
}

/**
 * Result of a pattern match
 */
export interface MatchResult {
  /** Type of value matched (color, spacing, etc.) */
  type: MatchType;
  
  /** The actual value that was matched (e.g., "#ff0000") */
  value: string;
  
  /** Original property name that contained the value (e.g., "color") */
  property: string;
  
  /** Original property scope (e.g., "style", "className", etc.) */
  scope: 'style' | 'className' | 'prop' | 'styledComponent';
  
  /** Context around the match (helpful for replacement) */
  context: {
    /** Full line of code that contains the match */
    line: string;
    
    /** Component or element that contains the match */
    element?: string;
  };
  
  /** Location information */
  location: MatchLocation;
  
  /** When style is in an object literal or Tailwind class, property path to the value */
  path?: string[];
  
  /** Additional metadata specific to the matcher */
  metadata?: Record<string, any>;
}

/**
 * Options for pattern matchers
 */
export interface MatcherOptions {
  /** Types of values to match */
  types?: MatchType[];
  
  /** Whether to include context in match results */
  includeContext?: boolean;
  
  /** Limit the scope of the search (e.g., only match inline styles) */
  scopeLimit?: Array<'style' | 'className' | 'prop' | 'styledComponent'>;
  
  /** Custom patterns to match */
  customPatterns?: RegExp[];
}

/**
 * Interface for pattern matchers
 */
export interface PatternMatcher {
  /**
   * Match patterns in source code
   * @param source Source code to search
   * @param options Matching options
   * @returns Array of match results
   */
  match(source: string, options?: MatcherOptions): MatchResult[];
  
  /**
   * Get the name of the matcher
   */
  getName(): string;
}

/**
 * Convert a position index to line and column
 * @param source Source text
 * @param index Character index in the source
 * @returns Line and column information
 */
export function getLineAndColumn(source: string, index: number): { line: number; column: number } {
  // Handle invalid indices
  if (index < 0 || index > source.length) {
    return { line: 0, column: 0 };
  }
  
  // Count lines and find column
  const lines = source.substring(0, index).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  
  return { line, column };
}

/**
 * Create a new match location
 * @param source Source text
 * @param start Start index
 * @param end End index
 * @returns Match location object
 */
export function createMatchLocation(source: string, start: number, end: number): MatchLocation {
  const { line, column } = getLineAndColumn(source, start);
  return { start, end, line, column };
}

/**
 * Extract the entire line containing a match
 * @param source Source text
 * @param index Position in the source
 * @returns Full line containing the position
 */
export function getFullLine(source: string, index: number): string {
  const lineStart = source.lastIndexOf('\n', index - 1) + 1;
  const lineEnd = source.indexOf('\n', index);
  return source.substring(lineStart, lineEnd === -1 ? source.length : lineEnd);
}

/**
 * Extract a context segment around a match
 * @param source Source text
 * @param start Start index
 * @param end End index
 * @param contextSize Number of characters of context to include
 * @returns Context string
 */
export function getContext(source: string, start: number, end: number, contextSize = 100): string {
  const contextStart = Math.max(0, start - contextSize);
  const contextEnd = Math.min(source.length, end + contextSize);
  return source.substring(contextStart, contextEnd);
}