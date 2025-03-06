/**
 * Tests for TailwindClassMatcher
 */

import { describe, it, expect } from 'vitest';
import { TailwindClassMatcher } from '../../src/matchers/TailwindClassMatcher.js';

describe('TailwindClassMatcher', () => {
  const matcher = new TailwindClassMatcher();

  describe('Basic functionality', () => {
    it('should identify arbitrary color classes', () => {
      const source = `
        <div className="bg-[#25C9D0] text-[rgb(85,85,85)]">
          Hello world
        </div>
      `;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('color');
      expect(results[0].value).toBe('#25C9D0');
      expect(results[0].property).toBe('backgroundColor');
      expect(results[0].scope).toBe('className');
      
      expect(results[1].type).toBe('color');
      expect(results[1].value).toBe('rgb(85,85,85)');
      expect(results[1].property).toBe('color');
      expect(results[1].scope).toBe('className');
    });

    it('should extract element name from JSX', () => {
      const source = `<Button className="bg-[#ff0000]">Click me</Button>`;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(1);
      expect(results[0].context.element).toBe('Button');
    });

    it('should handle dynamic className with template literals', () => {
      const source = `
        <div className={\`container mx-auto bg-[\${isDarkMode ? '#000000' : '#ffffff'}]\`}>
          Content
        </div>
      `;

      const results = matcher.match(source);
      
      // This case is more complex and might not capture the dynamic value,
      // but it should at least identify the presence of an arbitrary color class
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('color');
      expect(results[0].scope).toBe('className');
    });
  });

  describe('Value type detection', () => {
    it('should correctly identify different color formats', () => {
      const source = `
        <div className="
          bg-[#f00] 
          text-[#ff0000] 
          border-[rgb(255,0,0)] 
          outline-[rgba(255,0,0,0.5)]
          fill-[hsl(0,100%,50%)]
        ">
          Colorful
        </div>
      `;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.type).toBe('color');
      });
      
      const values = results.map(r => r.value);
      expect(values).toContain('#f00');
      expect(values).toContain('#ff0000');
      expect(values).toContain('rgb(255,0,0)');
      expect(values).toContain('rgba(255,0,0,0.5)');
      expect(values).toContain('hsl(0,100%,50%)');
    });

    it('should correctly identify spacing values', () => {
      const source = `
        <div className="
          p-[16px] 
          m-[2rem] 
          gap-[1.5em]
        ">
          Spacious
        </div>
      `;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.type).toBe('spacing');
      });
      
      const values = results.map(r => r.value);
      expect(values).toContain('16px');
      expect(values).toContain('2rem');
      expect(values).toContain('1.5em');
    });

    it('should correctly identify border radius values', () => {
      const source = `
        <div className="
          rounded-[8px] 
          rounded-t-[0.5rem]
        ">
          Rounded corners
        </div>
      `;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.type).toBe('borderRadius');
      });
      
      const values = results.map(r => r.value);
      expect(values).toContain('8px');
      expect(values).toContain('0.5rem');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple classes on a single element', () => {
      const source = `
        <div className="bg-[#fff] text-[#000] p-[1rem] rounded-[4px]">
          Multiple classes
        </div>
      `;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(4);
      
      const types = results.map(r => r.type);
      expect(types).toContain('color');
      expect(types).toContain('spacing');
      expect(types).toContain('borderRadius');
    });

    it('should handle className with conditional expressions', () => {
      const source = `
        <div className={isActive ? "bg-[#f00]" : "bg-[#ccc]"}>
          Conditional
        </div>
      `;

      const results = matcher.match(source);
      
      // This simple example should recognize both color values
      expect(results).toHaveLength(2);
      expect(results[0].value).toBe('#f00');
      expect(results[1].value).toBe('#ccc');
    });

    it('should handle classNames spread across multiple lines', () => {
      const source = `
        <div
          className="
            bg-[#333]
            text-[#eee]
            p-[1.5rem]
          "
        >
          Multi-line
        </div>
      `;

      const results = matcher.match(source);
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.value)).toContain('#333');
      expect(results.map(r => r.value)).toContain('#eee');
      expect(results.map(r => r.value)).toContain('1.5rem');
    });
  });
});