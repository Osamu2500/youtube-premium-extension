import { describe, it, expect, beforeEach } from 'vitest';

// Basic mock to allow settings-schema to load in Node
global.window = { YPP: {} };
await import('../src/content/config/settings-schema.js');

describe('Settings Schema Validation', () => {
    let schema;

    beforeEach(() => {
        schema = window.YPP.SettingsSchema;
    });

    it('should fill missing keys with defaults', () => {
        const raw = {};
        const result = schema.validateAndMerge(raw);
        expect(result.schemaVersion).toBe(1);
        expect(result.premiumTheme).toBe(true);
        expect(result.activeTheme).toBe('default');
    });

    it('should clamp numbers out of bounds', () => {
        const raw = { thumbRadius: 999, sidebarOpacity: 10 };
        const result = schema.validateAndMerge(raw);
        // max is 24, min is 50
        expect(result.thumbRadius).toBe(24);
        expect(result.sidebarOpacity).toBe(50);
    });

    it('should reset wrong types to default', () => {
        const raw = { premiumTheme: 'yes', hideShorts: 1 };
        const result = schema.validateAndMerge(raw);
        expect(result.premiumTheme).toBe(true); // default
        expect(result.hideShorts).toBe(false); // default
    });
});
