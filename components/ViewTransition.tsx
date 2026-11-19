/**
 * React's `<ViewTransition>`. Since React 19.3 it is a stable export with its own types, and the
 * Next.js App Router supports it without a config flag. Components import it from here so that
 * tests can replace this one module with `test/stubs/ViewTransition`.
 */
export { ViewTransition as default } from 'react';
