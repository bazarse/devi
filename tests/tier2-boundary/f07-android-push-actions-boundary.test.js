/**
 * Tier 2 - Feature 7 Boundary: Android Native Push Action Buttons
 * Tests edge intent parameters, null extras, long dealIds, and channel notification IDs.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');

describe('Tier 2 - Feature 7 Boundary: Android Native Push Action Buttons', () => {
  // Simulated Notification Builder and Intent Resolver
  function parseAndroidIntentData(intent) {
    const action = intent.action || null;
    const dealId = intent.extras?.dealId || null;
    const url = intent.extras?.url || null;
    const remoteInput = intent.remoteInput || null;

    let destinationPath = '/';
    if (url) {
      destinationPath = url;
    } else if (action === 'ACTION_EDIT_DEAL' && dealId) {
      destinationPath = `/admin/super/approvals?editDealId=${dealId}`;
    }

    return {
      action,
      dealId,
      destinationPath,
      hasInlineReason: Boolean(remoteInput?.key_reject_reason)
    };
  }

  it('F7-B1: Intent with full 36-character UUID dealId is correctly extracted without truncation', () => {
    const uuid = '3be59f85-2859-476c-b402-31c552a83146';
    const parsed = parseAndroidIntentData({
      action: 'ACTION_EDIT_DEAL',
      extras: { dealId: uuid }
    });
    assertEqual(parsed.dealId, uuid);
    assertEqual(parsed.destinationPath, `/admin/super/approvals?editDealId=${uuid}`);
  });

  it('F7-B2: Missing url extra defaults safely to home path / without throwing null exception', () => {
    const parsed = parseAndroidIntentData({
      action: 'ACTION_VIEW',
      extras: {}
    });
    assertEqual(parsed.destinationPath, '/');
  });

  it('F7-B3: Null or missing extras bundle does not crash intent receiver', () => {
    const parsed = parseAndroidIntentData({
      action: 'ACTION_VIEW',
      extras: null
    });
    assertEqual(parsed.dealId, null);
    assertEqual(parsed.destinationPath, '/');
  });

  it('F7-B4: Rejection RemoteInput with empty string is identified as missing inline reason', () => {
    const parsed = parseAndroidIntentData({
      action: 'ACTION_REJECT_DEAL',
      extras: { dealId: 'd-101' },
      remoteInput: { key_reject_reason: '' }
    });
    assertEqual(parsed.hasInlineReason, false);
  });

  it('F7-B5: Notification ID generation produces positive integer for arbitrary dealId hashes', () => {
    function generateNotificationId(dealId) {
      if (!dealId) return 1001;
      let hash = 0;
      for (let i = 0; i < dealId.length; i++) {
        hash = (hash << 5) - hash + dealId.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash) || 1001;
    }

    assert(generateNotificationId('deal-abc') > 0);
    assert(generateNotificationId('d-3be59f85-2859-476c-b402-31c552a83146') > 0);
    assert(generateNotificationId(null) === 1001);
  });
});
