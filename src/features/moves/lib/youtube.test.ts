import { describe, expect, it } from 'vitest';

import { extractVideoId } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('extractVideoId', () => {
  it.each([
    ['watch', `https://www.youtube.com/watch?v=${ID}`],
    ['youtu.be', `https://youtu.be/${ID}`],
    ['embed', `https://www.youtube.com/embed/${ID}`],
    ['shorts', `https://www.youtube.com/shorts/${ID}`],
    ['shorts with query', `https://youtube.com/shorts/${ID}?feature=share`],
    ['live', `https://www.youtube.com/live/${ID}`],
    ['/v/', `https://www.youtube.com/v/${ID}`],
  ])('extracts the id from a %s url', (_label, url) => {
    expect(extractVideoId(url)).toBe(ID);
  });

  it('returns null when there is no video id', () => {
    expect(extractVideoId('https://www.youtube.com/')).toBeNull();
  });
});
