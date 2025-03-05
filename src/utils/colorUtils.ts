/**
 * Utility functions for color format conversions and comparison
 */

// Type definitions
type RGB = { r: number; g: number; b: number; a?: number };
type HSL = { h: number; s: number; l: number; a?: number };
type OKLCH = { l: number; c: number; h: number; a?: number };

/**
 * Parse a color string into an object with all color formats
 * @param colorStr The color string to parse (hex, rgb, rgba, hsl, hsla, oklch)
 * @returns Object with various color format representations
 */
export function parseColor(colorStr: string): { 
  hex: string;
  rgb: RGB;
  hsl?: HSL;
  oklch?: OKLCH;
} {
  // Remove all whitespace
  const cleanedStr = colorStr.replace(/\s+/g, '');
  
  // Check for OKLCH format (common in modern design systems)
  if (cleanedStr.startsWith('oklch(')) {
    return parseOklchColor(cleanedStr);
  }

  // Check for hex format
  if (cleanedStr.startsWith('#')) {
    return parseHexColor(cleanedStr);
  }
  
  // Check for rgb/rgba format
  if (cleanedStr.startsWith('rgb(') || cleanedStr.startsWith('rgba(')) {
    return parseRgbColor(cleanedStr);
  }
  
  // Check for hsl/hsla format
  if (cleanedStr.startsWith('hsl(') || cleanedStr.startsWith('hsla(')) {
    return parseHslColor(cleanedStr);
  }
  
  // Default fallback - parse as black
  console.warn(`Unrecognized color format: ${colorStr}, defaulting to black`);
  return {
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 }
  };
}

/**
 * Parse OKLCH color format
 * Note: This uses a simplified conversion since full OKLCH conversion is complex
 * For production use, consider using a color library for accurate conversions
 * @param oklchStr OKLCH color string (e.g., "oklch(70% 0.12 200)")
 */
function parseOklchColor(oklchStr: string): { 
  hex: string;
  rgb: RGB;
  hsl?: HSL;
  oklch: OKLCH;
} {
  // Extract OKLCH components
  const match = oklchStr.match(/oklch\(([^)]+)\)/);
  if (!match) {
    throw new Error(`Invalid OKLCH color: ${oklchStr}`);
  }
  
  const parts = match[1].split(/\s+|,\s*/).filter(Boolean);
  
  // Parse lightness (removing % if present)
  const l = parseFloat(parts[0].replace('%', '')) / (parts[0].includes('%') ? 100 : 1);
  
  // Parse chroma and hue
  const c = parseFloat(parts[1]);
  const h = parseFloat(parts[2]);
  
  // Parse alpha if present
  const a = parts.length >= 4 ? parseFloat(parts[3]) : undefined;
  
  // Store the OKLCH values
  const oklch: OKLCH = { l, c, h, a };
  
  // Convert to RGB (simplified approximation)
  // This is a very simplified conversion and won't be accurate
  // In production, use a proper color library for OKLCH conversions
  const rgb = approximateOklchToRgb(oklch);
  
  // Convert RGB to hex
  const hex = rgbToHex(rgb);
  
  // Convert RGB to HSL
  const hsl = rgbToHsl(rgb);
  
  return { hex, rgb, hsl, oklch };
}

/**
 * Very simplified approximation of OKLCH to RGB conversion
 * This is NOT accurate and should be replaced with a proper color library in production
 */
function approximateOklchToRgb(oklch: OKLCH): RGB {
  // This is a placeholder implementation
  // For real conversion, use a proper color library
  
  // Lightness ranges from 0 to 1, where 0 is black and 1 is white
  const l = Math.max(0, Math.min(1, oklch.l));
  
  // Chroma is color intensity
  const c = Math.max(0, Math.min(0.4, oklch.c));
  
  // Hue is in degrees (0-360)
  const h = oklch.h % 360;
  
  // Extremely simplified conversion that's not accurate
  // Just to have something to preview with
  let r, g, b;
  
  // Simplified conversion based on hue
  const hueSection = Math.floor(h / 60);
  const hueRemainder = (h % 60) / 60;
  
  const colorValue = l * (1 + c * 2 - 1);
  const min = l * (1 - c);
  const mid = l * (1 - c * (1 - hueRemainder));
  const max = l * (1 - c * hueRemainder);
  
  switch (hueSection % 6) {
    case 0: r = colorValue; g = mid; b = min; break;
    case 1: r = max; g = colorValue; b = min; break;
    case 2: r = min; g = colorValue; b = mid; break;
    case 3: r = min; g = max; b = colorValue; break;
    case 4: r = mid; g = min; b = colorValue; break;
    case 5: r = colorValue; g = min; b = max; break;
    default: r = l; g = l; b = l;
  }
  
  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255))),
    a: oklch.a
  };
}

/**
 * Parse a hex color string
 * @param hexStr Hex color string (e.g., "#FF5500" or "#F50")
 */
function parseHexColor(hexStr: string): { 
  hex: string;
  rgb: RGB;
  hsl: HSL;
} {
  // Normalize hex string
  let hex = hexStr.replace('#', '');
  
  // Convert shorthand (#RGB) to full form (#RRGGBB)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Parse alpha if present
  let a;
  if (hex.length === 8) {
    a = parseInt(hex.substring(6, 8), 16) / 255;
  }
  
  const rgb: RGB = { r, g, b, a };
  const hsl = rgbToHsl(rgb);
  
  return {
    hex: '#' + hex,
    rgb,
    hsl
  };
}

/**
 * Parse RGB/RGBA color string
 * @param rgbStr RGB/RGBA color string (e.g., "rgb(255, 0, 0)" or "rgba(255, 0, 0, 0.5)")
 */
function parseRgbColor(rgbStr: string): { 
  hex: string;
  rgb: RGB;
  hsl: HSL;
} {
  // Extract RGB components
  const isRgba = rgbStr.startsWith('rgba(');
  const values = rgbStr
    .replace(isRgba ? 'rgba(' : 'rgb(', '')
    .replace(')', '')
    .split(',')
    .map(val => val.trim());
  
  const r = parseInt(values[0], 10);
  const g = parseInt(values[1], 10);
  const b = parseInt(values[2], 10);
  const a = isRgba ? parseFloat(values[3]) : undefined;
  
  const rgb: RGB = { r, g, b, a };
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  
  return { hex, rgb, hsl };
}

/**
 * Parse HSL/HSLA color string
 * @param hslStr HSL/HSLA color string (e.g., "hsl(120, 100%, 50%)" or "hsla(120, 100%, 50%, 0.5)")
 */
function parseHslColor(hslStr: string): { 
  hex: string;
  rgb: RGB;
  hsl: HSL;
} {
  // Check if color is HSLA
  const isHsla = hslStr.startsWith('hsla(');
  
  // Extract HSL components
  const values = hslStr
    .replace(isHsla ? 'hsla(' : 'hsl(', '')
    .replace(')', '')
    .split(',')
    .map(val => val.trim());
  
  // Parse h, s, l values
  const h = parseInt(values[0], 10);
  const s = parseInt(values[1], 10) / 100;
  const l = parseInt(values[2], 10) / 100;
  const a = isHsla ? parseFloat(values[3]) : undefined;
  
  const hsl: HSL = { h, s, l, a };
  const rgb = hslToRgb(hsl);
  const hex = rgbToHex(rgb);
  
  return { hex, rgb, hsl };
}

/**
 * Convert RGB to hex string
 * @param rgb RGB color object
 * @returns Hex color string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (value: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  const r = toHex(rgb.r);
  const g = toHex(rgb.g);
  const b = toHex(rgb.b);
  
  let hex = '#' + r + g + b;
  
  // Add alpha if present
  if (rgb.a !== undefined && rgb.a < 1) {
    const a = toHex(Math.round(rgb.a * 255));
    hex += a;
  }
  
  return hex;
}

/**
 * Convert RGB to HSL
 * @param rgb RGB color object
 * @returns HSL color object
 */
export function rgbToHsl(rgb: RGB): HSL {
  // Normalize RGB values to 0-1 range
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    if (max === r) {
      h = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    
    h = Math.round(h * 60);
  }
  
  s = Math.round(s * 100);
  const lightness = Math.round(l * 100);
  
  return {
    h,
    s,
    l: lightness,
    a: rgb.a
  };
}

/**
 * Convert HSL to RGB
 * @param hsl HSL color object
 * @returns RGB color object
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s;
  const l = hsl.l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    // Achromatic (gray)
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsl.a
  };
}

/**
 * Calculate color distance (simple Euclidean distance in RGB space)
 * More sophisticated algorithms like CIEDE2000 would be better for production
 * @param color1 First RGB color
 * @param color2 Second RGB color
 * @returns Distance value (lower means more similar)
 */
export function calculateColorDistance(color1: RGB, color2: RGB): number {
  const rDiff = Math.pow(color1.r - color2.r, 2);
  const gDiff = Math.pow(color1.g - color2.g, 2);
  const bDiff = Math.pow(color1.b - color2.b, 2);
  
  // Simple Euclidean distance in RGB space
  const distance = Math.sqrt(rDiff + gDiff + bDiff);
  
  // Normalize to a 0-1 scale (255 * sqrt(3) is maximum possible distance)
  return distance / (255 * Math.sqrt(3));
}

/**
 * Find the closest color match from a list of colors
 * @param targetColor The color to match
 * @param colors Array of candidate colors to match against
 * @returns The closest matching color and its confidence score
 */
export function findClosestColor(targetColor: RGB, colors: Array<{color: RGB, token: any}>): {
  match: any;
  confidence: number;
} {
  if (colors.length === 0) {
    return { match: null, confidence: 0 };
  }
  
  let closestMatch = colors[0];
  let smallestDistance = calculateColorDistance(targetColor, colors[0].color);
  
  for (let i = 1; i < colors.length; i++) {
    const distance = calculateColorDistance(targetColor, colors[i].color);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestMatch = colors[i];
    }
  }
  
  // Convert distance to confidence (1 - normalized distance)
  // Lower distance = higher confidence
  const confidence = 1 - smallestDistance;
  
  return {
    match: closestMatch.token,
    confidence
  };
}