'use strict';

const { stripLatex, splitSentences, toLatexOffset, offsetToLine } = require('../../extension/src/utils/latex-parse.js');

describe('stripLatex', () => {
  test('removes simple commands', () => {
    const { text } = stripLatex('Hello \\textbf{world}');
    expect(text).toContain('Hello');
    expect(text).toContain('world');
    expect(text).not.toContain('\\textbf');
  });

  test('removes comments', () => {
    const { text } = stripLatex('hello % this is a comment\nworld');
    expect(text).toContain('hello');
    expect(text).toContain('world');
    expect(text).not.toContain('comment');
  });

  test('removes math environments', () => {
    const { text } = stripLatex('We have $x^2 + y^2 = z^2$ in the equation.');
    expect(text).not.toContain('x^2');
    expect(text).toContain('We have');
    expect(text).toContain('in the equation');
  });

  test('builds offsetMap of correct length', () => {
    const src = 'hello world';
    const { text, offsetMap } = stripLatex(src);
    expect(text).toBe('hello world');
    expect(offsetMap.length).toBe(text.length);
  });

  test('offsetMap maps plain-text positions to source positions', () => {
    const src = 'hello world';
    const { text, offsetMap } = stripLatex(src);
    // No commands, so offsets should match directly
    expect(offsetMap[0]).toBe(0);
    expect(offsetMap[5]).toBe(5); // space
  });
});

describe('splitSentences', () => {
  test('splits on periods', () => {
    const sentences = splitSentences('Hello world. This is a test.');
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  test('returns start/end positions', () => {
    const text = 'First sentence. Second sentence.';
    const sentences = splitSentences(text);
    expect(sentences[0].start).toBe(0);
    expect(sentences[0].text).toContain('First');
  });

  test('handles text without terminal punctuation', () => {
    const text = 'No period here';
    const sentences = splitSentences(text);
    expect(sentences.length).toBe(1);
    expect(sentences[0].text.trim()).toBe('No period here');
  });
});

describe('toLatexOffset', () => {
  test('maps within bounds', () => {
    const offsetMap = [0, 1, 2, 3, 4];
    expect(toLatexOffset(offsetMap, 2)).toBe(2);
  });

  test('clamps at end', () => {
    const offsetMap = [0, 1, 2];
    expect(toLatexOffset(offsetMap, 100)).toBe(2);
  });

  test('returns 0 for negative', () => {
    const offsetMap = [5, 6, 7];
    expect(toLatexOffset(offsetMap, -1)).toBe(0);
  });
});

describe('offsetToLine', () => {
  test('counts newlines correctly', () => {
    const src = 'line1\nline2\nline3';
    expect(offsetToLine(src, 0)).toBe(1);
    expect(offsetToLine(src, 6)).toBe(2);
    expect(offsetToLine(src, 12)).toBe(3);
  });

  test('returns 1 for offset 0', () => {
    expect(offsetToLine('anything', 0)).toBe(1);
  });
});
