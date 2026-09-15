/**
 * E2E Testing Harness & Assertion Engine
 * Powered by happy-dom for authentic DOM simulation and W3C compliance.
 */

import { GlobalWindow } from 'happy-dom';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface TestContext {
  currentSuite: string;
  beforeEachFns: Array<() => void | Promise<void>>;
  afterEachFns: Array<() => void | Promise<void>>;
  tests: Array<{ suite: string; name: string; fn: () => void | Promise<void> }>;
}

const context: TestContext = {
  currentSuite: 'Default',
  beforeEachFns: [],
  afterEachFns: [],
  tests: [],
};

// --- In-Memory W3C Storage ---
export class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  get length(): number {
    return this.store.size;
  }

  dump(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [k, v] of this.store.entries()) {
      obj[k] = v;
    }
    return obj;
  }
}

let currentWindow: GlobalWindow | null = null;
let currentStorage: MemoryStorage | null = null;

const safeAssign = (target: any, key: string, val: any) => {
  try {
    target[key] = val;
  } catch {
    try {
      Object.defineProperty(target, key, { value: val, configurable: true, writable: true });
    } catch {}
  }
};

// --- Browser Environment Simulator ---
export function setupBrowserEnvironment(): { window: any; document: any; storage: MemoryStorage } {
  if (!currentWindow) {
    currentWindow = new GlobalWindow({ url: 'http://localhost:3000' });
    currentStorage = new MemoryStorage();

    const win = currentWindow as any;

    // Polyfill globalThis with real DOM constructors and window/document
    safeAssign(globalThis, 'window', win);
    safeAssign(globalThis, 'document', win.document);
    safeAssign(globalThis, 'location', win.location);
    safeAssign(globalThis, 'history', win.history);

    const domConstructors = [
      'Node', 'Element', 'DocumentFragment', 'HTMLElement', 'HTMLInputElement',
      'HTMLButtonElement', 'HTMLAnchorElement', 'HTMLFormElement', 'HTMLDivElement',
      'HTMLTableElement', 'HTMLTableRowElement', 'HTMLTableCellElement',
      'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent',
      'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'
    ];

    for (const c of domConstructors) {
      if (win[c]) {
        safeAssign(globalThis, c, win[c]);
      }
    }

    // AudioContext for AwardModal
    (globalThis as any).AudioContext = class MockAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: () => {},
        };
      }
    };
    win.AudioContext = (globalThis as any).AudioContext;

    // Canvas mock for canvas-confetti
    const originalCreateElement = win.document.createElement.bind(win.document);
    win.document.createElement = (tag: string) => {
      const el = originalCreateElement(tag);
      if (tag.toLowerCase() === 'canvas') {
        (el as any).getContext = () => new Proxy({}, { get: (_t, prop) => (prop === 'canvas' ? el : () => {}) });
      }
      return el;
    };

    safeAssign(globalThis, 'addEventListener', win.addEventListener.bind(win));
    safeAssign(globalThis, 'removeEventListener', win.removeEventListener.bind(win));
    safeAssign(globalThis, 'dispatchEvent', win.dispatchEvent.bind(win));
    safeAssign(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

    // URL.createObjectURL and revokeObjectURL
    if (!globalThis.URL.createObjectURL) {
      (globalThis.URL as any).createObjectURL = (_blob: any) => `blob:mock-${Date.now()}-${Math.random()}`;
      (globalThis.URL as any).revokeObjectURL = (_url: string) => {};
    }
    if (!win.URL.createObjectURL) {
      win.URL.createObjectURL = (globalThis.URL as any).createObjectURL;
      win.URL.revokeObjectURL = (globalThis.URL as any).revokeObjectURL;
    }

    // Dialog spies
    (globalThis as any).alert = (_msg: string) => {};
    (globalThis as any).confirm = (_msg: string) => true;
    win.alert = (globalThis as any).alert;
    win.confirm = (globalThis as any).confirm;
  }

  safeAssign(globalThis, 'localStorage', currentStorage);

  return { window: currentWindow, document: currentWindow.document, storage: currentStorage! };
}

export async function mountComponent(element: any): Promise<{
  container: any;
  unmount: () => void;
}> {
  const React = await import('react');
  const { act } = React as any;
  const { createRoot } = (await import('react-dom/client')) as any;

  const container = (globalThis as any).document.createElement('div');
  (globalThis as any).document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

// --- Assertion Library ---
function createAssertionMatchers<T = any>(actual: T, isNegated = false) {
  return {
    toBe(expected: any) {
      const pass = actual === expected;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`
            : `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`
        );
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      const pass = a === b;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected deep inequality:\nActual:   ${a}\nExpected NOT: ${b}`
            : `Expected deep equality:\nActual:   ${a}\nExpected: ${b}`
        );
      }
    },
    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${JSON.stringify(actual)} to be falsy`
            : `Expected ${JSON.stringify(actual)} to be truthy`
        );
      }
    },
    toBeFalsy() {
      const pass = !actual;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${JSON.stringify(actual)} to be truthy`
            : `Expected ${JSON.stringify(actual)} to be falsy`
        );
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${JSON.stringify(actual)} NOT to be null`
            : `Expected ${JSON.stringify(actual)} to be null`
        );
      }
    },
    toBeGreaterThan(n: number) {
      const pass = typeof actual === 'number' && actual > n;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${actual} NOT to be greater than ${n}`
            : `Expected ${actual} to be greater than ${n}`
        );
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      const pass = typeof actual === 'number' && actual >= n;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${actual} NOT to be greater than or equal to ${n}`
            : `Expected ${actual} to be greater than or equal to ${n}`
        );
      }
    },
    toBeLessThan(n: number) {
      const pass = typeof actual === 'number' && actual < n;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${actual} NOT to be less than ${n}`
            : `Expected ${actual} to be less than ${n}`
        );
      }
    },
    toBeLessThanOrEqual(n: number) {
      const pass = typeof actual === 'number' && actual <= n;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${actual} NOT to be less than or equal to ${n}`
            : `Expected ${actual} to be less than or equal to ${n}`
        );
      }
    },
    toContain(item: any) {
      let pass = false;
      if (typeof actual === 'string') {
        pass = actual.includes(String(item));
      } else if (Array.isArray(actual)) {
        pass = actual.includes(item);
      } else {
        throw new Error(`toContain called on unsupported type: ${typeof actual}`);
      }
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected "${actual}" NOT to contain "${item}"`
            : `Expected "${actual}" to contain "${item}"`
        );
      }
    },
    toMatch(regex: RegExp) {
      const pass = typeof actual === 'string' && regex.test(actual);
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected "${actual}" NOT to match ${regex}`
            : `Expected "${actual}" to match ${regex}`
        );
      }
    },
    toBeUndefined() {
      const pass = typeof actual === 'undefined';
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected value NOT to be undefined, received ${JSON.stringify(actual)}`
            : `Expected undefined, received ${JSON.stringify(actual)}`
        );
      }
    },
    toBeDefined() {
      const pass = typeof actual !== 'undefined';
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected value to be undefined, received ${JSON.stringify(actual)}`
            : `Expected defined value, received undefined`
        );
      }
    },
    toBeCloseTo(expected: number, delta = 0.001) {
      const pass = typeof actual === 'number' && Math.abs(actual - expected) <= delta;
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected ${actual} NOT to be within ${delta} of ${expected}`
            : `Expected ${actual} to be within ${delta} of ${expected}`
        );
      }
    },
    toThrow(expectedSubstring?: string) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected actual to be a function, received ${typeof actual}`);
      }
      let threw = false;
      let caughtError: any;
      try {
        (actual as any)();
      } catch (err: any) {
        threw = true;
        caughtError = err;
      }
      const pass = threw && (!expectedSubstring || caughtError?.message?.includes(expectedSubstring));
      if (isNegated ? pass : !pass) {
        throw new Error(
          isNegated
            ? `Expected function NOT to throw`
            : `Expected function to throw${expectedSubstring ? ` message containing "${expectedSubstring}"` : ''}, but ${threw ? `got "${caughtError?.message}"` : 'it succeeded'}`
        );
      }
    }
  };
}

export function expect<T = any>(actual: T) {
  const matchers = createAssertionMatchers(actual, false);
  const notMatchers = createAssertionMatchers(actual, true);
  return {
    ...matchers,
    not: notMatchers
  };
}

// --- Test Suite Definitions ---
export function describe(suiteName: string, fn: () => void): void {
  const prevSuite = context.currentSuite;
  context.currentSuite = suiteName;
  fn();
  context.currentSuite = prevSuite;
}

export function it(testName: string, fn: () => void | Promise<void>): void {
  context.tests.push({
    suite: context.currentSuite,
    name: testName,
    fn,
  });
}

export const test = it;

export function beforeEach(fn: () => void | Promise<void>): void {
  context.beforeEachFns.push(fn);
}

export function afterEach(fn: () => void | Promise<void>): void {
  context.afterEachFns.push(fn);
}

export async function runRegisteredTests(filter?: string): Promise<{
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const t of context.tests) {
    if (filter && !t.suite.toLowerCase().includes(filter.toLowerCase()) && !t.name.toLowerCase().includes(filter.toLowerCase())) {
      continue;
    }

    // Run beforeEach
    for (const bf of context.beforeEachFns) {
      await bf();
    }

    const start = performance.now();
    let testPassed = false;
    let error: Error | undefined;

    try {
      await t.fn();
      testPassed = true;
      passed++;
    } catch (err: any) {
      testPassed = false;
      error = err instanceof Error ? err : new Error(String(err));
      failed++;
    } finally {
      const durationMs = performance.now() - start;
      results.push({
        suite: t.suite,
        name: t.name,
        passed: testPassed,
        error,
        durationMs,
      });

      // Run afterEach
      for (const af of context.afterEachFns) {
        try {
          await af();
        } catch {}
      }
    }
  }

  return {
    passed,
    failed,
    total: passed + failed,
    results,
  };
}

export function clearRegisteredSuites(): void {
  context.tests = [];
  context.beforeEachFns = [];
  context.afterEachFns = [];
}
