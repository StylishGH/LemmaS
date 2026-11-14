import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const frontendRequire = createRequire(new URL('../../frontend/package.json', import.meta.url));
const ts = frontendRequire('typescript');
const React = frontendRequire('react');
const { renderToStaticMarkup } = frontendRequire('react-dom/server');
const moduleCache = new Map();

function loadModule(relative) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  if (moduleCache.has(filename)) return moduleCache.get(filename);
  const output = ts.transpileModule(readFileSync(filename, 'utf8').replace("import 'katex/dist/katex.min.css';", ''), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL('../../frontend', import.meta.url)));
  const origRequire = compiled.require.bind(compiled);
  compiled.require = (id) => {
    if (id === '@/lib/community') return loadModule('../../frontend/lib/community.ts');
    return origRequire(id);
  };
  compiled._compile(output, filename);
  moduleCache.set(filename, compiled.exports);
  return compiled.exports;
}

const {
  positiveId,
  pageNumber,
  parseCommunityWrite,
  communityError,
  communityRequest,
  sanitizeAvatarUrl,
  getCommentInitials,
} = loadModule('../../frontend/lib/community.ts');
const { CommentText } = loadModule('../../frontend/components/community/CommentText.tsx');
const { CommentAvatar } = loadModule('../../frontend/components/community/CommentAvatar.tsx');

test('IDs and page bounds reject coercions and unsafe numbers', () => {
  for (const value of [null, false, true, [], {}, 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(positiveId(value), null);
  assert.equal(positiveId('42'), 42);
  assert.equal(pageNumber('5001'), null);
  assert.equal(pageNumber('-1'), null);
  assert.equal(pageNumber('0'), 0);
});

test('writes whitelist fields and never accept supplied authors or status', () => {
  const parsed = parseCommunityWrite({ action: 'post', questionId: 1, body: ' BANAL. ', alias: 'Cadete', author_id: 'victim', status: 'hidden' });
  assert.equal(parsed.p_body, 'BANAL.');
  assert.equal('author_id' in parsed, false);
  assert.equal('status' in parsed, false);
  assert.equal(parseCommunityWrite({ action: 'post', questionId: 1, body: ' '.repeat(8) }), null);
  assert.equal(parseCommunityWrite({ action: 'post', questionId: 1, body: 'a'.repeat(2001) }), null);
  assert.equal(parseCommunityWrite({ action: 'post', questionId: 1, body: 'a', spoiler: 'false' }), null);
  assert.equal(parseCommunityWrite({ action: 'post', questionId: 1, body: 'a', alias: '<script>' }), null);
  assert.equal(parseCommunityWrite({ action: 'like', questionId: 1, commentId: 'garbage' }), null);
  assert.equal(parseCommunityWrite({ action: 'report', questionId: 1, commentId: '00000000-0000-0000-0000-000000000001', reason: 'toString' }), null);
});

test('backend implementation details never reach public errors', () => {
  assert.equal(communityError({ code: 'PGRST202', message: 'secret database schema' }).status, 503);
  assert.equal(communityError({ code: 'P0001', message: 'internal detail' }).status, 503);
  assert.equal(communityError({ code: 'P0001', message: 'Aguarde antes de publicar novamente.' }).status, 429);
  assert.equal(communityError({ code: '42501' }).status, 403);
});

test('free text and markdown images stay inert', () => {
  const html = renderToStaticMarkup(React.createElement(CommentText, { text: '<img src=x onerror=alert(1)> ![pixel](https://tracker.test/pixel)' }));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('explicit LaTeX renders with unsafe extensions disabled', () => {
  const html = renderToStaticMarkup(React.createElement(CommentText, { text: 'Banal. $x^2$ $$\\frac{1}{2}$$ $\\href{javascript:alert(1)}{click}$ $\\includegraphics{https://tracker.test/x}$ \\(\\alpha\\) \\[y=1\\]' }));
  assert.ok(html.includes('katex'));
  assert.ok(!html.includes('<a '));
  assert.ok(!html.includes('<img'));
});

test('communityRequest handles non-JSON upstream error responses without leaking syntax errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>502 Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } });
  try {
    await assert.rejects(() => communityRequest('/api/community?questionId=1'), /Não foi possível carregar os comentários\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sanitizeAvatarUrl and getCommentInitials enforce safe URLs and clean initials', () => {
  assert.equal(sanitizeAvatarUrl('https://lh3.googleusercontent.com/a/avatar123'), 'https://lh3.googleusercontent.com/a/avatar123');
  assert.equal(sanitizeAvatarUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(sanitizeAvatarUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeAvatarUrl('http://insecure.example/a.png'), null);
  assert.equal(sanitizeAvatarUrl('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(sanitizeAvatarUrl('https://evil.test/<script>'), null);
  assert.equal(sanitizeAvatarUrl(null), null);

  assert.equal(getCommentInitials('Admin do papiro'), 'AP');
  assert.equal(getCommentInitials('Cadete_2027'), 'C2');
  assert.equal(getCommentInitials('Estudante'), 'ES');
  assert.equal(getCommentInitials(''), 'ES');
  assert.equal(getCommentInitials(null), 'ES');
});

test('CommentAvatar renders sanitized photo or initials fallback safely', () => {
  const photoHtml = renderToStaticMarkup(
    React.createElement(CommentAvatar, {
      alias: 'Admin do papiro',
      avatarUrl: 'https://cdn.lemmas.test/foto.png',
    }),
  );
  assert.ok(photoHtml.includes('<img'));
  assert.ok(photoHtml.includes('src="https://cdn.lemmas.test/foto.png"'));
  assert.ok(photoHtml.includes('referrerPolicy="no-referrer"') || photoHtml.includes('referrerpolicy="no-referrer"'));
  assert.ok(photoHtml.includes('alt="Foto de Admin do papiro"'));

  const fallbackHtml = renderToStaticMarkup(
    React.createElement(CommentAvatar, {
      alias: 'Admin do papiro',
      avatarUrl: 'javascript:alert(1)',
    }),
  );
  assert.ok(!fallbackHtml.includes('<img'));
  assert.ok(fallbackHtml.includes('>AP<'));

  const removedHtml = renderToStaticMarkup(
    React.createElement(CommentAvatar, {
      alias: 'Comentário removido',
      avatarUrl: 'https://cdn.lemmas.test/foto.png',
      removed: true,
    }),
  );
  assert.ok(!removedHtml.includes('<img'));
  assert.ok(removedHtml.includes('>?<'));
});
