'use client';

import type { ReactNode } from 'react';

import sortObject from '@/utils/sortObject';
import type {
  AddressesQueryResult,
  PageBySlugQueryResult,
} from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const EMAIL_RE = /([^\s@]+@[^\s@]+\.[^\s@]+)/;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Render plain text, turning any email address into a mailto link.
function linkifyEmails(text: string): ReactNode[] {
  return text.split(EMAIL_RE).map((part, i) =>
    isEmail(part) ? (
      <a
        key={i}
        href={`mailto:${part}`}
        className="text-blue underline underline-offset-2 transition-colors hover:text-accent"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export const ContactBody = ({
  Heading,
  name,
  richcontent,
  addresses,
}: {
  id: Page['id'];
  Heading: Page['Heading'];
  name: Page['name'];
  richcontent: Page['richcontent'];
  addresses: AddressesQueryResult;
}) => {
  const offices = sortObject(addresses);

  return (
    <main className="header-offset bg-white text-blue px-5 pb-40 min-h-[80vh]">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-sans font-bold text-blue text-h1 mt-8 mb-8 tracking-[-0.01em]">
          {name || Heading}
        </h1>

        <div className="mb-16 max-w-[680px] text-h4 text-blue [&_p]:m-0 [&_p]:mb-3 [&_p:last-child]:mb-0">
          {richcontent?.map((block) => {
            const text = (block?.children ?? [])
              .map((c) => c?.text ?? '')
              .join('');
            return (
              <p key={block?._key}>{text ? linkifyEmails(text) : ' '}</p>
            );
          })}
        </div>

        <div className="grid max-w-[900px] grid-cols-2 gap-x-12 gap-y-10 max-tablet:grid-cols-1">
          {offices.map((office) => (
            <div key={office._id}>
              <h2 className="font-sans font-bold text-blue text-h3 m-0 mb-2">
                {office.address}
              </h2>
              <address className="text-blue not-italic [&_p]:m-0 [&_p]:leading-relaxed">
                {String(office.details ?? '')
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
              </address>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
