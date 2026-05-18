'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

import { useOnClickOutside } from '@/utils/useOnClickOutside';
import BurgerMenu from '@/components/BurgerMenu';
import Menu from '@/components/Menu';
import type { NavigationQueryResult } from '@/sanity.types';

function Nav({ navigation }: { navigation: NavigationQueryResult }) {
  const [open, setOpen] = useState(false);
  const node = useRef<HTMLDivElement>(null);
  useOnClickOutside(node, () => setOpen(false));
  return (
    <motion.div ref={node}>
      <BurgerMenu open={open} setOpen={setOpen} />
      <Menu
        open={open}
        setOpen={setOpen}
        siteLocation="header"
        navigation={navigation}
      />
    </motion.div>
  );
}

export default Nav;
