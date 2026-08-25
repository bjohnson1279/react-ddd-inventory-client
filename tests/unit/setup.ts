import '@testing-library/jest-dom';

// Mock localStorage and sessionStorage for jsdom environment
// jsdom provides these globals but they can be undefined in async useEffect contexts
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock, writable: true });
