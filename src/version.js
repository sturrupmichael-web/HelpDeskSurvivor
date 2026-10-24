// The game's version: the time of the last commit (UTC), stamped in by build.mjs. Shown on the
// title and settings screens and sent with posted scores. dev.html isn't built, so "dev".
export const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';

// True in a preview build (node build.mjs --preview): a test copy at /preview/.
export const PREVIEW = typeof __PREVIEW__ === 'boolean' ? __PREVIEW__ : false;
