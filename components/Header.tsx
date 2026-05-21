'use client';

import { useEffect, useRef } from 'react';

import Logo from '@/components/Logo';
import Nav from '@/components/Nav';
import type { NavigationQueryResult, SettingsQueryResult } from '@/sanity.types';

function Header({
    settings,
    navigation,
}: {
    settings: SettingsQueryResult;
    navigation: NavigationQueryResult;
}) {
    const headerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const node = headerRef.current;
        if (!node || typeof window === 'undefined') return;
        const setHeight = () => {
            const h = node.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--header-height', `${h}px`);
        };
        setHeight();
        const ro = new ResizeObserver(setHeight);
        ro.observe(node);
        window.addEventListener('resize', setHeight);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', setHeight);
        };
    }, []);

    return (
        <header
            ref={headerRef}
            className="fixed top-0 left-0 z-[10000] w-full bg-white px-[7%] py-5 transition-colors duration-300 ease-in-out"
        >
            <div className="tablet:grid tablet:grid-cols-[1fr_2fr]">
                <div className="flex flex-row flex-nowrap items-center justify-start [&>*]:max-w-[168px] [&>*]:flex-auto max-tablet:py-4 max-tablet:pl-6 max-tablet:pr-8 max-tablet:text-left max-[375px]:px-0">
                    <Logo className="dark-logo" image={settings?.logoDark} />
                    <Logo className="light-logo" image={settings?.logoLight} />
                </div>
                <Nav navigation={navigation} />
            </div>
        </header>
    );
}

export default Header;
