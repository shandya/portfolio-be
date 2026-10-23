import { describe, it, expect } from 'vitest';
import { parseOrigins, wwwTwin } from '../src/lib/cors';

describe('wwwTwin', () => {
  it('maps www to the bare domain and back, keeping scheme and port', () => {
    expect(wwwTwin('https://www.shandya.com')).toBe('https://shandya.com');
    expect(wwwTwin('https://shandya.com')).toBe('https://www.shandya.com');
    expect(wwwTwin('http://example.com:8080')).toBe('http://www.example.com:8080');
  });

  it('leaves localhost, IPs, deeper subdomains and junk alone', () => {
    expect(wwwTwin('http://localhost:3000')).toBeNull();
    expect(wwwTwin('http://127.0.0.1:3000')).toBeNull();
    expect(wwwTwin('http://[::1]:3000')).toBeNull();
    expect(wwwTwin('https://app.shandya.com')).toBeNull();
    expect(wwwTwin('https://www')).toBeNull();
    expect(wwwTwin('not a url')).toBeNull();
    expect(wwwTwin('ftp://shandya.com')).toBeNull();
  });
});

describe('parseOrigins', () => {
  it('adds twins, trims whitespace and trailing slashes, and de-duplicates', () => {
    expect(parseOrigins(' https://www.shandya.com/ , https://shandya.com ,http://localhost:3000')).toEqual([
      'https://www.shandya.com',
      'https://shandya.com',
      'http://localhost:3000',
    ]);
  });

  it('returns an empty list when nothing is configured', () => {
    expect(parseOrigins('')).toEqual([]);
    expect(parseOrigins(' , ')).toEqual([]);
  });

  it('does not widen to unrelated hosts', () => {
    const origins = parseOrigins('https://www.shandya.com');
    expect(origins).not.toContain('https://evil.com');
    expect(origins).not.toContain('https://shandya.com.evil.com');
    expect(origins).toHaveLength(2);
  });
});
