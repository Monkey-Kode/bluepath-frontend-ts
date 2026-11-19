import type { ReactNode } from 'react';

/** Stands in for React's ViewTransition in tests. It shows the names a component passes. */
export default function ViewTransitionStub({
  name,
  share,
  children,
}: {
  name?: string;
  share?: string;
  children: ReactNode;
}) {
  return (
    <div data-vt-name={name} data-vt-share={share}>
      {children}
    </div>
  );
}

/** Each transition a render names, as [name, share] in document order. */
export const transitionNames = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-vt-name]')].map((node) => [
    node.getAttribute('data-vt-name'),
    node.getAttribute('data-vt-share'),
  ]);
