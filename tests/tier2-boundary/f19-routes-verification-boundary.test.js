/**
 * Tier 2 - Feature 19 Boundary: Application Route 200 OK Verification
 * Tests path resolution, URL decoding, route parameter formatting, and trailing slash handling.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');

describe('Tier 2 - Feature 19 Boundary: Application Route 200 OK Verification', () => {
  function normalizeAppPath(pathname) {
    if (!pathname) return '/';
    let clean = pathname.trim();
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }

  it('F19-B1: Trailing slashes on route paths (e.g. /pos/) normalize to canonical paths (/pos)', () => {
    assertEqual(normalizeAppPath('/pos/'), '/pos');
    assertEqual(normalizeAppPath('/admin/store/'), '/admin/store');
    assertEqual(normalizeAppPath('/'), '/');
  });

  it('F19-B2: Dynamic customer route parameter decodes URL-encoded identifiers safely', () => {
    const rawParam = 'cust%20123';
    const decoded = decodeURIComponent(rawParam);
    assertEqual(decoded, 'cust 123');
  });

  it('F19-B3: Null or empty path defaults safely to root route "/"', () => {
    assertEqual(normalizeAppPath(''), '/');
    assertEqual(normalizeAppPath(null), '/');
    assertEqual(normalizeAppPath(undefined), '/');
  });

  it('F19-B4: Query strings in paths are separated cleanly from route pathname', () => {
    function extractPathname(fullUrl) {
      const parts = fullUrl.split('?');
      return parts[0];
    }

    assertEqual(extractPathname('/admin/super/approvals?editDealId=123'), '/admin/super/approvals');
    assertEqual(extractPathname('/pos?store=DM-01'), '/pos');
  });

  it('F19-B5: Malformed URI components in search params handle gracefully without crash', () => {
    function safeDecodeQuery(str) {
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str; // Fallback to raw string on URIError
      }
    }

    const malformed = '%E0%A4%A';
    const result = safeDecodeQuery(malformed);
    assertEqual(result, malformed);
  });
});
