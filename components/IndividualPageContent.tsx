import { PortableText, type PortableTextComponents } from '@portabletext/react';

import type { PageBySlugQueryResult } from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const ptComponents: PortableTextComponents = {
  marks: {
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target={value?.blank ? '_blank' : undefined}
        rel={value?.blank ? 'noopener noreferrer' : undefined}
        className="text-blue underline underline-offset-2 transition-colors hover:text-accent"
      >
        {children}
      </a>
    ),
  },
};

/**
 * Default content page (privacy, terms, etc.). Renders the page's Rich Content
 * as a clean reading-width article. The homepage section box (ContentBox) is
 * intentionally NOT used here — that component is reserved for homesections.
 */
const IndividualPageContent = ({ page }: { page: Page }) => {
  const { Heading, name, richcontent } = page;
  const hasRich = Array.isArray(richcontent) && richcontent.length > 0;
  const title = Heading || name;

  return (
    <main className="header-offset bg-white text-blue px-5 pb-24">
      <article className="mx-auto max-w-7xl px-5">
        {title && (
          <h1 className="font-sans font-bold text-blue text-h1 mt-8 mb-8">
            {title}
          </h1>
        )}
        <div className="prose prose-default max-w-none">
          {hasRich ? (
            <PortableText value={richcontent} components={ptComponents} />
          ) : null}
        </div>
      </article>
    </main>
  );
};

export default IndividualPageContent;
