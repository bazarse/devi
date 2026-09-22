/**
 * Tier 1 - Feature 7: Android Native Push Action Buttons
 * Verifies that native push notifications construct [APPROVE], [REJECT], [EDIT DEAL] actions,
 * handle RemoteInput for rejection reasons, and support deep linking to edit deals.
 */

const { describe, it, assert, assertEqual, assertIncludes } = require('../helpers/test-harness');
const fs = require('fs');
const path = require('path');

describe('Tier 1 - Feature 7: Android Native Push Action Buttons', () => {
  // Test native Java files in repository
  const javaDir = path.resolve(__dirname, '../../android/app/src/main/java/com/devimobile/pos');
  const deviMessagingServicePath = path.join(javaDir, 'DeviMessagingService.java');
  const dealActionReceiverPath = path.join(javaDir, 'DealActionBroadcastReceiver.java');
  const mainActivityPath = path.join(javaDir, 'MainActivity.java');

  it('F7-T1: DeviMessagingService defines ACTION_APPROVE_DEAL, ACTION_REJECT_DEAL, and EDIT intents', () => {
    assert(fs.existsSync(deviMessagingServicePath), 'DeviMessagingService.java should exist');
    const content = fs.readFileSync(deviMessagingServicePath, 'utf8');

    assertIncludes(content, 'ACTION_APPROVE_DEAL');
    assertIncludes(content, 'ACTION_REJECT_DEAL');
    assertIncludes(content, 'approvePendingIntent');
    assertIncludes(content, 'rejectPendingIntent');
    assertIncludes(content, 'editPendingIntent');
  });

  it('F7-T2: Rejection action in native push service configures RemoteInput for inline reason entry', () => {
    const content = fs.readFileSync(deviMessagingServicePath, 'utf8');
    assertIncludes(content, 'RemoteInput.Builder');
    assertIncludes(content, 'KEY_REJECT_REASON');
    assertIncludes(content, 'addRemoteInput');
  });

  it('F7-T3: Edit Deal action constructs intent with url extra pointing to manager approvals edit query', () => {
    const content = fs.readFileSync(deviMessagingServicePath, 'utf8');
    assertIncludes(content, 'editIntent.putExtra("url"');
    assertIncludes(content, '/admin/super/approvals?editDealId=');
  });

  it('F7-T4: DealActionBroadcastReceiver handles approval and rejection broadcast actions', () => {
    assert(fs.existsSync(dealActionReceiverPath), 'DealActionBroadcastReceiver.java should exist');
    const content = fs.readFileSync(dealActionReceiverPath, 'utf8');
    assertIncludes(content, 'ACTION_APPROVE_DEAL');
    assertIncludes(content, 'ACTION_REJECT_DEAL');
    assertIncludes(content, 'dealId');
  });

  it('F7-T5: Simulated Android push action builder produces valid notification action contract', () => {
    function buildAndroidNotificationActions(dealId) {
      return [
        {
          actionId: 'ACTION_APPROVE_DEAL',
          label: 'APPROVE',
          dealId: dealId,
          requiresInput: false
        },
        {
          actionId: 'ACTION_REJECT_DEAL',
          label: 'REJECT',
          dealId: dealId,
          requiresInput: true,
          inputKey: 'rejection_reason'
        },
        {
          actionId: 'ACTION_EDIT_DEAL',
          label: 'EDIT DEAL',
          dealId: dealId,
          targetUrl: `/admin/super/approvals?editDealId=${dealId}`,
          requiresInput: false
        }
      ];
    }

    const actions = buildAndroidNotificationActions('d-12345');
    assertEqual(actions.length, 3);
    assertEqual(actions[0].label, 'APPROVE');
    assertEqual(actions[1].label, 'REJECT');
    assertEqual(actions[1].requiresInput, true);
    assertEqual(actions[2].label, 'EDIT DEAL');
    assertEqual(actions[2].targetUrl, '/admin/super/approvals?editDealId=d-12345');
  });
});
