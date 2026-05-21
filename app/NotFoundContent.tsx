'use client';

import Link from 'next/link';

export default function NotFoundContent() {
    return (
        <main className="header-offset bg-white text-blue pb-20 px-5 flex items-center justify-center min-h-[calc(100vh-var(--header-height,100px))]">
            <div className="max-w-[720px] mx-auto text-center">
                <p className="font-serif font-bold text-blue text-[clamp(5rem,_14vw,_10rem)] leading-none m-0 mb-2">
                    404
                </p>
                <hr
                    aria-hidden="true"
                    className="w-16 h-px bg-accent border-0 mx-auto my-6"
                />
                <h1 className="font-sans font-bold text-blue tracking-[0.04em] text-[clamp(1.25rem,_2vw,_1.75rem)]  m-0 mb-4">
                    Page Not Found
                </h1>
                <p className="font-serif text-black text-base m-0 mb-8">
                    The page you’re looking for doesn’t exist or may have moved. Try
                    heading back to the homepage, or visit our News &amp; Events to see
                    what we’ve been up to.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-blue text-white font-sans uppercase tracking-[0.12em] text-[0.8125rem] font-normal no-underline px-3 py-2 rounded-md transition-colors duration-200 hover:bg-accent hover:text-white"
                >
                    BACK TO HOME
                </Link>
            </div>
        </main>
    );
}
