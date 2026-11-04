'use client';

import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { twMerge } from 'tailwind-merge';

import { useOnClickOutside } from '@/utils/useOnClickOutside';

/** The header row shows from the tablet breakpoint up. Below it, the header shows its drawer. */
const DESKTOP = '(min-width: 800px)';

/** A mouse over the header row opens a dropdown (D-1). In the drawer, only a tap or click does. */
const isHover = (event: PointerEvent) =>
  event.pointerType === 'mouse' && window.matchMedia(DESKTOP).matches;

/**
 * A disclosure dropdown for a top-level menu item with sub-items (FR-001, AC-1.1 to AC-1.3).
 * The toggle names the parent and reports `aria-expanded`. The sub-items render as `children`,
 * one `<li>` each. A click on any of their links closes the dropdown and calls `onNavigate`.
 */
function NavDropdown({
  label,
  className,
  toggleClassName,
  listClassName,
  onNavigate,
  children,
}: {
  label: ReactNode;
  className?: string;
  toggleClassName?: string;
  listClassName?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const item = useRef<HTMLLIElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // A hover opened the dropdown, so the click that follows keeps it open instead of closing it.
  const openedByHover = useRef(false);

  const close = () => {
    openedByHover.current = false;
    setExpanded(false);
  };
  useOnClickOutside(item, close);

  const links = () => Array.from(list.current?.querySelectorAll('a') ?? []);

  const onKeyDown = (event: KeyboardEvent) => {
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'Escape' && expanded) {
      toggle.current?.focus();
      close();
    } else if (event.key === 'ArrowDown') {
      // The list must render before its first link can take focus.
      if (!expanded) flushSync(() => setExpanded(true));
      all[at + 1]?.focus();
    } else if (event.key === 'ArrowUp' && at >= 0) {
      (at === 0 ? toggle.current : all[at - 1])?.focus();
    } else {
      return;
    }
    event.preventDefault();
  };

  const onBlur = (event: FocusEvent) => {
    if (!item.current?.contains(event.relatedTarget)) close();
  };

  const onPointerEnter = (event: PointerEvent) => {
    if (!isHover(event) || expanded) return;
    openedByHover.current = true;
    setExpanded(true);
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (!isHover(event)) return;
    openedByHover.current = false;
    if (!item.current?.contains(document.activeElement)) close();
  };

  const onToggle = () => {
    if (openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    setExpanded((open) => !open);
  };

  const onListClick = (event: MouseEvent) => {
    if (!(event.target as Element).closest('a')) return;
    close();
    onNavigate?.();
  };

  return (
    <li
      ref={item}
      className={className}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        ref={toggle}
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={onToggle}
        className={toggleClassName}
      >
        {/* A small triangle before the label marks the item as a menu (AC-1.1). */}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className={twMerge(
            'h-[0.4em] w-[0.65em] shrink-0 fill-current motion-safe:transition-transform',
            expanded && 'rotate-180',
          )}
        >
          <path d="M0 0h10L5 6z" />
        </svg>
        {label}
      </button>
      {/* A click on a sub-item's link bubbles here. Enter on a link fires the same click. */}
      <ul
        ref={list}
        id={listId}
        hidden={!expanded}
        onClick={onListClick}
        className={listClassName}
      >
        {children}
      </ul>
    </li>
  );
}

export default NavDropdown;
