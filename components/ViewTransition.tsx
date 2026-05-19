import * as React from 'react';

/**
 * React's `<ViewTransition>` ships in the canary React channel that the Next.js
 * App Router bundles (enabled here via `experimental.viewTransition`). It is a
 * real runtime export — see the Next "Designing view transitions" guide — but
 * `@types/react` only declares it under canary types, so `import { ViewTransition }
 * from 'react'` fails `tsc`. This module is the single place that bridges the
 * runtime export to a typed component.
 */

type ViewTransitionClass =
  | 'none'
  | 'auto'
  | (string & {})
  | Record<string, string>;

export type ViewTransitionProps = {
  name?: string;
  share?: ViewTransitionClass;
  enter?: ViewTransitionClass;
  exit?: ViewTransitionClass;
  update?: ViewTransitionClass;
  default?: ViewTransitionClass;
  children: React.ReactNode;
};

const ViewTransition = (
  React as unknown as {
    ViewTransition: React.ComponentType<ViewTransitionProps>;
  }
).ViewTransition;

export default ViewTransition;
