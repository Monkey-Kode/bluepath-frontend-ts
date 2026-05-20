'use client';

import classNames from 'classnames';
import { Dispatch, SetStateAction } from 'react';

const BAR =
  'block w-8 h-[0.17rem] rounded-[10px] origin-[1px] transition-all duration-300 ease-linear relative';

function BurgerMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <button
      type="button"
      data-open={open}
      onClick={() => setOpen(!open)}
      className={classNames(
        'burger-menu',
        // Hidden on desktop; visible drawer toggle on mobile only
        'hidden max-tablet:absolute max-tablet:right-8 max-tablet:top-[calc(153px/2-2rem)] max-tablet:z-10 max-tablet:flex max-tablet:h-6 max-tablet:w-8 max-tablet:flex-col max-tablet:justify-around max-tablet:border-none max-tablet:bg-transparent max-tablet:p-0 max-tablet:cursor-pointer focus:outline-none',
        { open },
      )}
      aria-label="Toggle navigation"
      aria-expanded={open}
    >
      <span
        className={classNames(
          BAR,
          open
            ? 'bg-white rotate-45 -translate-y-[6px]'
            : 'bg-blue rotate-0',
        )}
      />
      <span
        className={classNames(
          BAR,
          open ? 'bg-white opacity-0 translate-x-5' : 'bg-blue opacity-100',
        )}
      />
      <span
        className={classNames(
          BAR,
          open
            ? 'bg-white -rotate-45 translate-x-[2px] translate-y-[3px]'
            : 'bg-blue rotate-0',
        )}
      />
    </button>
  );
}

export default BurgerMenu;
