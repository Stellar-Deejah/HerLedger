// Plain constants module -- deliberately has no "use client" directive.
// ActivityList (client) and ActivityListServer (server) both need
// PAGE_SIZE, but a Server Component can't import a plain value from a
// "use client" module: the RSC bundler replaces every named export of a
// client module with an opaque client-reference proxy when a server module
// imports it (only the component itself is meant to cross that boundary),
// so ActivityListServer would receive a placeholder function instead of 20.
// A directive-free shared module sidesteps the boundary entirely.
export const PAGE_SIZE = 20;
