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

export const addressesQuery = defineQuery(`
  *[_type == "address"] | order(order asc){
    _id,
    name,
    address,
    details,
    order,
    location
  }
`);

export const sitemapQuery = defineQuery(`
  *[_type in ["page", "event", "news"] && defined(slug.current)]{
    _type,
    "slug": slug.current,
    _updatedAt
  }
`);

/* ---------- homepage ---------- */

export const homesectionsQuery = defineQuery(`
  *[_type == "homesections"] | order(order asc){
    _id,
    "id": _id,
    name,
    anchorId,
    order,
    sectionContent,
    sectionContentCTAjumpId,
    sectionContentCTAtext,
    sectionContentCTAurl,
    "sectionContentCTApageLink": sectionContentCTApageLink->{ "slug": slug.current },
    hidetitle,
    sectionHeading,
    sectionHeadingPosition,
    boxLocation,
    backgroundColor{ hex },
    background{ ${imageFields} },
    contentType->{ _id, name }
  }
`);

export const carouselQuery = defineQuery(`
  *[_type == "carousel"] | order(order asc){
    _id,
    "id": _id,
    _key,
    heading,
    content,
    firstLink, firstLinkId, firstLinkURL,
    secondLink, secondLinkId, secondLinkURL,
    boxLocation,
    order,
    image{ ${imageFields} }
  }
`);

export const homevideoQuery = defineQuery(`
  *[_type == "homevideo"]{
    _id,
    "id": _id,
    name,
    youtubeLink,
    video{ asset->{ url, originalFilename, mimeType } },
    mobileVideo{ asset->{ url, originalFilename, mimeType } },
    videoPoster{ ${imageFields} }
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
    "id": _id,
    content,
    richcontent,
    sectionContentCTAtext,
    sectionContentCTAjumpId,
    sectionContentCTAurl,
    "sectionContentCTApageLink": sectionContentCTApageLink->{ "slug": slug.current },
    backgroundColor{ hex },
    background{ ${imageFields} },
    mobilebackground{ ${imageFields} },
    contentType->{ _id, name },
    seotitle,
    description
  }
`);

/* ---------- page content clusters (contentType dispatch) ---------- */

export const impactItemsQuery = defineQuery(`
  *[_type == "impact"] | order(order asc){
    _id,
    "id": _id,
    name,
    order,
    content1, content2, content3, content4,
    contentheading1, contentheading2, contentheading3, contentheading4,
    image{ ${imageFields} }
  }
`);

export const carbonoffsetsQuery = defineQuery(`
  *[_type == "carbonoffsets"] | order(order asc){
    _id,
    "id": _id,
    name,
    order,
    hexagons[]{
      _key,
      heading,
      order,
      name,
      content,
      backgroundColor{ hex },
      icon{ ${imageFields} }
    }
  }
`);

export const teamQuery = defineQuery(`
  *[_type == "team"] | order(order asc){
    _id,
    "id": _id,
    name,
    "slug": slug.current,
    role,
    roleSubtitle,
    excerpt,
    bio,
    order,
    image{ ${imageFields} }
  }
`);

export const teamSlugsQuery = defineQuery(`
  *[_type == "team" && defined(slug.current)]{ "slug": slug.current }
`);

export const teamMemberBySlugQuery = defineQuery(`
  *[_type == "team" && slug.current == $slug][0]{
    _id,
    _type,
    "id": _id,
    name,
    "slug": slug.current,
    role,
    roleSubtitle,
    excerpt,
    bio,
    order,
    image{ ${imageFields} }
  }
`);

export const casestudiesQuery = defineQuery(`
  *[_type == "casestudies"]{
    _id,
    "id": _id,
    title,
    entity,
    financing,
    size,
    technologies,
    content,
    address,
    state,
    location,
    image{ ${imageFields} }
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
    body[]{
      ...,
      _type == "imageWithCaption" => {
        ...,
        image{ ..., asset->{ url, altText } }
      },
      markDefs[]{
        ...,
        _type == "internalLink" => {
          ...,
          reference->{ _type, slug }
        }
      }
    },
    seoDescription
  }
`);
