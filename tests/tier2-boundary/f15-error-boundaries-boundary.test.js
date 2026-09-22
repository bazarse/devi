/**
 * Tier 2 - Feature 15 Boundary: Localized Error Boundaries
 * Tests nested boundaries, thrown non-Error values, repeated resets, and missing fallback properties.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');

describe('Tier 2 - Feature 15 Boundary: Localized Error Boundaries', () => {
  class SimulatedErrorBoundary {
    constructor(props = {}) {
      this.props = props;
      this.state = { hasError: false, error: null };
    }
    catchError(err) {
      this.state.hasError = true;
      this.state.error = err instanceof Error ? err : new Error(String(err));
    }
    reset() {
      this.state.hasError = false;
      this.state.error = null;
    }
    render(fn) {
      if (this.state.hasError) {
        return {
          type: 'fallback',
          title: this.props.fallbackTitle || 'Error Occurred',
          message: this.state.error?.message || 'Unknown glitch'
        };
      }
      try {
        return { type: 'content', content: fn() };
      } catch (e) {
        this.catchError(e);
        return this.render(fn);
      }
    }
  }

  it('F15-B1: Boundary safely catches non-Error string throws (throw "Fatal string")', () => {
    const boundary = new SimulatedErrorBoundary();
    const res = boundary.render(() => {
      throw 'Raw string error thrown';
    });
    assertEqual(res.type, 'fallback');
    assertEqual(res.message, 'Raw string error thrown');
  });

  it('F15-B2: Boundary catches undefined throws (throw undefined) without crash', () => {
    const boundary = new SimulatedErrorBoundary();
    const res = boundary.render(() => {
      throw undefined;
    });
    assertEqual(res.type, 'fallback');
    assertEqual(res.message, 'undefined');
  });

  it('F15-B3: Calling reset() when not in error state is safe no-op', () => {
    const boundary = new SimulatedErrorBoundary();
    boundary.reset();
    assertEqual(boundary.state.hasError, false);
    assertEqual(boundary.state.error, null);
  });

  it('F15-B4: Nested boundaries: inner boundary catches while outer boundary remains healthy', () => {
    const outer = new SimulatedErrorBoundary({ fallbackTitle: 'Outer Shell' });
    const inner = new SimulatedErrorBoundary({ fallbackTitle: 'Inner Card' });

    const outerRes = outer.render(() => {
      const innerRes = inner.render(() => {
        throw new Error('Inner failure');
      });
      return { innerType: innerRes.type, innerTitle: innerRes.title };
    });

    assertEqual(outerRes.type, 'content');
    assertEqual(outerRes.content.innerType, 'fallback');
    assertEqual(outerRes.content.innerTitle, 'Inner Card');
    assertEqual(outer.state.hasError, false);
  });

  it('F15-B5: Fallback title defaults safely to "Error Occurred" when fallbackTitle prop is omitted', () => {
    const boundary = new SimulatedErrorBoundary({});
    const res = boundary.render(() => {
      throw new Error('Crash');
    });
    assertEqual(res.title, 'Error Occurred');
  });
});
