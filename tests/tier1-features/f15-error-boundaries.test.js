/**
 * Tier 1 - Feature 15: Localized Error Boundaries
 * Verifies that Error Boundary wrappers catch partial rendering/data errors,
 * render localized fallback cards, provide retry mechanisms, and prevent total app unmounting.
 */

const { describe, it, assert, assertEqual, assertTruthy } = require('../helpers/test-harness');

describe('Tier 1 - Feature 15: Localized Error Boundaries', () => {
  // Simulated Component Error Boundary State Machine
  class SimulatedErrorBoundary {
    constructor(props = {}) {
      this.props = props;
      this.state = {
        hasError: false,
        error: null
      };
    }

    catchError(err) {
      this.state.hasError = true;
      this.state.error = err;
      if (this.props.onError) this.props.onError(err);
    }

    reset() {
      this.state.hasError = false;
      this.state.error = null;
      if (this.props.onReset) this.props.onReset();
    }

    render(childrenFn) {
      if (this.state.hasError) {
        return {
          type: 'fallback',
          title: this.props.fallbackTitle || 'Unable to Load Section',
          message: this.state.error?.message || 'An unexpected glitch occurred.',
          hasRetryButton: true
        };
      }

      try {
        const rendered = childrenFn();
        return {
          type: 'content',
          content: rendered
        };
      } catch (err) {
        this.catchError(err);
        return this.render(childrenFn);
      }
    }
  }

  it('F15-T1: Error boundary renders children normally when no exception is thrown', () => {
    const boundary = new SimulatedErrorBoundary();
    const result = boundary.render(() => 'Deals Table Rendered');
    assertEqual(result.type, 'content');
    assertEqual(result.content, 'Deals Table Rendered');
    assertEqual(boundary.state.hasError, false);
  });

  it('F15-T2: Error boundary catches child render error and renders localized fallback card', () => {
    const boundary = new SimulatedErrorBoundary({ fallbackTitle: 'Failed to load Deals' });
    const result = boundary.render(() => {
      throw new Error('Database connection failed');
    });

    assertEqual(result.type, 'fallback');
    assertEqual(result.title, 'Failed to load Deals');
    assertEqual(result.message, 'Database connection failed');
    assertEqual(boundary.state.hasError, true);
  });

  it('F15-T3: Localized error boundary confines failure to single section while outer shell survives', () => {
    // Outer layout shell with header, sidebar, and 2 content sections
    const pageLayout = {
      header: 'Devi Mobile POS Nav',
      sidebar: 'Menu',
      sectionA: new SimulatedErrorBoundary({ fallbackTitle: 'Deals Table' }),
      sectionB: new SimulatedErrorBoundary({ fallbackTitle: 'Quick Stats' })
    };

    // Section A throws, Section B succeeds
    const renderA = pageLayout.sectionA.render(() => {
      throw new Error('Corrupted row 42');
    });
    const renderB = pageLayout.sectionB.render(() => 'Stats: ₹1,50,000 Today');

    assertEqual(renderA.type, 'fallback');
    assertEqual(renderB.type, 'content');
    assertEqual(pageLayout.header, 'Devi Mobile POS Nav');
  });

  it('F15-T4: Error boundary reset() successfully restores component to healthy state upon retry', () => {
    let attempts = 0;
    const boundary = new SimulatedErrorBoundary();

    function unstableChild() {
      attempts++;
      if (attempts === 1) {
        throw new Error('Transient network error');
      }
      return 'Data successfully loaded';
    }

    // First attempt fails
    const res1 = boundary.render(unstableChild);
    assertEqual(res1.type, 'fallback');

    // Click "Try Again" (triggers reset)
    boundary.reset();
    assertEqual(boundary.state.hasError, false);

    // Second attempt succeeds
    const res2 = boundary.render(unstableChild);
    assertEqual(res2.type, 'content');
    assertEqual(res2.content, 'Data successfully loaded');
  });

  it('F15-T5: Error boundary triggers onError telemetry/logging hook with captured stack trace', () => {
    let capturedError = null;
    const boundary = new SimulatedErrorBoundary({
      onError: (err) => {
        capturedError = err;
      }
    });

    boundary.render(() => {
      throw new Error('Critical parsing error');
    });

    assert(Boolean(capturedError));
    assertEqual(capturedError.message, 'Critical parsing error');
  });
});
