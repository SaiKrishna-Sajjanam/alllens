import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lightPicture } from '../lib/pictures';

test('the lightest version an outlet offers; no animated GIFs', () => {
  assert.equal(lightPicture('https://th-i.thgim.com/public/incoming/x/article1.ece/alternates/LANDSCAPE_1200/p.jpg'),
    'https://th-i.thgim.com/public/incoming/x/article1.ece/alternates/LANDSCAPE_480/p.jpg');
  assert.equal(lightPicture('https://images.indianexpress.com/2026/09/p.jpg'), 'https://images.indianexpress.com/2026/09/p.jpg?w=480');
  assert.equal(lightPicture('https://images.bhaskarassets.com/thumb/1000x1000/web2images/cover.gif'), null);
  assert.equal(lightPicture('https://static.toiimg.com/photo/msid-1.cms'), 'https://static.toiimg.com/photo/msid-1.cms');
  assert.equal(lightPicture('http://insecure.test/p.jpg'), null);
  assert.equal(lightPicture(null), null);
});
