/**
 * TypeScript 6 rejects side-effect imports of modules it has no declaration
 * for (TS2882). Next ships types for '*.module.css' but not for plain global
 * stylesheets, so declare them here.
 */
declare module '*.css';
