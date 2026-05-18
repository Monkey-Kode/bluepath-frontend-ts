import { defineQuery } from 'next-sanity';

/**
 * GROQ queries, ported from the Gatsby GraphQL layer.
 *
 * Every query uses `defineQuery` so Sanity TypeGen emits a typed result in
 * `sanity.types.ts` (inline queries are skipped by typegen — keep them named).
 *
 * Image/portable-text/reference projections are intentionally lean here and
 * are expanded per-route during the page/component ports (spec §1.5–§1.7),
 * where the exact field needs of each component are concrete.
 */

const imageFields = /* groq */ `
  ...,
  "alt": coalesce(asset->altText, asset->originalFilename, ""),
  asset->{
    _id,
    url,
    metadata { lqip, dimensions }
  }
`;

export const settingsQuery = defineQuery(`
  *[_type == "siteSettings"][0]{
    name,
    description,
    logoDark{ ${imageFields} },
    logoLight{ ${imageFields} }
  }
`);

export const navigationQuery = defineQuery(`
  *[_type == "navigation"] | order(order asc){
    _id,
    name,
    linkType,
    jumpLinkId,
    url,
    header,
    footer,
    order,
    "page": page->{ _type, "slug": slug.current }
  }
`);

export const homeQuery = defineQuery(`
  *[_type == "home"][0]{
    _id,
    name,
    description,
    image{ ${imageFields} }
  }
`);

/* ---------- page ---------- */

export const allPageSlugsQuery = defineQuery(`
  *[_type == "page" && defined(slug.current)]{ "slug": slug.current }
`);

export const pageBySlugQuery = defineQuery(`
  *[_type == "page" && slug.current == $slug][0]{
    _id,
    _type,
    name,
    "slug": slug.current,
    hidetitle,
    Heading,
    sectionHeadingPosition,
    boxLocation,
    content,
    richcontent,
    sectionContentCTAtext,
    sectionContentCTAjumpId,
    sectionContentCTAurl,
    "sectionContentCTApageLink": sectionContentCTApageLink->{ "slug": slug.current },
    backgroundColor,
    background{ ${imageFields} },
    mobilebackground{ ${imageFields} },
    contentType->{ _id, _type },
    seotitle,
    description
  }
`);

/* ---------- event ---------- */

export const allEventSlugsQuery = defineQuery(`
  *[_type == "event" && defined(slug.current)]{ "slug": slug.current }
`);

export const allEventsQuery = defineQuery(`
  *[_type == "event"] | order(eventAt desc){
    _id,
    name,
    "slug": slug.current,
    eventAt,
    description,
    publication,
    image{ ${imageFields} }
  }
`);

export const eventBySlugQuery = defineQuery(`
  *[_type == "event" && slug.current == $slug][0]{
    _id,
    _type,
    name,
    "slug": slug.current,
    eventAt,
    publication,
    description,
    content,
    image{ ${imageFields} }
  }
`);

/* ---------- news ---------- */

export const allNewsSlugsQuery = defineQuery(`
  *[_type == "news" && defined(slug.current)]{ "slug": slug.current }
`);

export const allNewsQuery = defineQuery(`
  *[_type == "news"] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    subhead,
    publication,
    publishedAt,
    excerpt,
    heroImage{ ${imageFields} },
    featuredImage{ ${imageFields} }
  }
`);

export const newsBySlugQuery = defineQuery(`
  *[_type == "news" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    subhead,
    publication,
    publishedAt,
    excerpt,
    heroImage{ ${imageFields} },
    featuredImage{ ${imageFields} },
    body,
    seoDescription
  }
`);
