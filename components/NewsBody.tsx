'use client';

import { PortableText, type PortableTextComponents } from '@portabletext/react';
import getYouTubeId from 'get-youtube-id';

type SanityImageAsset =
    | {
        url?: string | null;
        altText?: string | null;
    }
    | null
    | undefined;

type SanityImageRef =
    | {
        asset?: SanityImageAsset;
    }
    | null
    | undefined;

const imageUrlFor = (image: SanityImageRef): string | null =>
    image?.asset?.url ?? null;

export const newsBodyComponents: PortableTextComponents = {
    block: {
        h1: ({ children }) => <h1>{children}</h1>,
        h2: ({ children }) => <h2>{children}</h2>,
        h3: ({ children }) => <h3>{children}</h3>,
        h4: ({ children }) => <h4>{children}</h4>,
        h5: ({ children }) => (
            <h5 className="mt-8 mb-2 font-sans text-lg font-semibold">{children}</h5>
        ),
        h6: ({ children }) => (
            <h6 className="mt-6 mb-2 font-sans text-base font-semibold uppercase tracking-wide">
                {children}
            </h6>
        ),
        blockquote: ({ children }) => <blockquote>{children}</blockquote>,
        normal: ({ children }) => <p>{children}</p>,
    },
    list: {
        bullet: ({ children }) => <ul>{children}</ul>,
        number: ({ children }) => <ol>{children}</ol>,
    },
    listItem: {
        bullet: ({ children }) => <li>{children}</li>,
        number: ({ children }) => <li>{children}</li>,
    },
    marks: {
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        code: ({ children }) => <code>{children}</code>,
        underline: ({ children }) => <span className="underline">{children}</span>,
        'strike-through': ({ children }) => <s>{children}</s>,
        textAlignLeft: ({ children }) => (
            <span className="block text-left">{children}</span>
        ),
        textAlignCenter: ({ children }) => (
            <span className="block text-center">{children}</span>
        ),
        textAlignRight: ({ children }) => (
            <span className="block text-right">{children}</span>
        ),
        link: ({ value, children }) => {
            const href = value?.href ?? '#';
            const target = value?.blank ? '_blank' : undefined;
            const rel = value?.blank ? 'noopener noreferrer' : undefined;
            return (
                <a href={href} target={target} rel={rel}>
                    {children}
                </a>
            );
        },
        internalLink: ({ value, children }) => {
            const slug = value?.reference?.slug?.current;
            const type = value?.reference?._type;
            const prefix =
                type === 'news' ? '/news/' : type === 'event' ? '/events/' : '/';
            return <a href={slug ? `${prefix}${slug}` : '#'}>{children}</a>;
        },
    },
    types: {
        imageWithCaption: ({ value }) => {
            const url = imageUrlFor(value?.image);
            if (!url) return null;
            return (
                <figure className="not-prose my-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        className="block h-auto w-full"
                        src={url}
                        alt={value?.alt ?? ''}
                    />
                    {value?.caption && (
                        <figcaption className="mt-2 text-center font-sans text-sm text-[var(--color-gray-2)]">
                            {value.caption}
                        </figcaption>
                    )}
                </figure>
            );
        },
        youtube: ({ value }) => {
            const id = value?.url ? getYouTubeId(value.url) : null;
            if (!id) return null;
            return (
                <div className="not-prose relative my-8 h-0 pb-[56.25%]">
                    <iframe
                        className="absolute inset-0 h-full w-full border-0"
                        src={`https://www.youtube.com/embed/${id}`}
                        title="YouTube video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
            );
        },
        divider: () => <div aria-hidden className="not-prose h-8" />,
        spacer: ({ value }) => (
            <div
                aria-hidden
                className="not-prose"
                style={{ height: value?.height ?? 100 }}
            />
        ),
    },
};

const NewsBody = ({ value }: { value: unknown }) => (
    <PortableText value={value as never} components={newsBodyComponents} />
);

export default NewsBody;
