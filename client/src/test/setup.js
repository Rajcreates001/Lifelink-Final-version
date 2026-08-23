import '@testing-library/jest-dom';

// Mock IntersectionObserver (used by landing page components)
if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class IntersectionObserver {
        constructor(callback, options) {
            this.callback = callback;
            this.options = options;
        }
        observe() { return null; }
        unobserve() { return null; }
        disconnect() { return null; }
    };
}

// Mock matchMedia
if (typeof globalThis.matchMedia === 'undefined') {
    globalThis.matchMedia = () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
    });
}

// Mock Leaflet L global
if (typeof globalThis.L === 'undefined') {
    globalThis.L = {
        Icon: { Default: { prototype: {}, mergeOptions: () => {} } },
        map: () => ({ setView: () => {}, on: () => {}, remove: () => {} }),
        tileLayer: () => ({ addTo: () => {} }),
        marker: () => ({ addTo: () => {}, bindPopup: () => {}, setLatLng: () => {} }),
        divIcon: () => ({}),
        latLng: () => ({}),
        latLngBounds: () => ({ contains: () => true }),
    };
}
