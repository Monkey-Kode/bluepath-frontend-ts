import type { BuildArgs, GatsbyNode } from "gatsby";
import { resolve } from "path";
import { ArrElement } from "./src/types";

// Sanity `page` slugs that must NOT be auto-routed because a hand-built
// Gatsby page in `src/pages/` owns that path and supplies the new design.
// Without this, gatsby-node's createPage runs after file-system pages and wins
// the route collision, falling back to the legacy Page.tsx template.
const STATIC_PAGE_SLUGS = new Set([
  "leadership",
  "news-and-events",
]);

const getPages = async ({ graphql, actions }: BuildArgs) => {
  const pageTemplate = resolve("./src/templates/Page.tsx");
  const { data }: any = await graphql(`
    query GetPages {
      allSanityPage {
        nodes {
          description
          hidetitle
          id
          name
          slug {
            current
          }
          boxLocation
          background {
            asset {
              gatsbyImageData(
                width: 2000
                layout: CONSTRAINED
                placeholder: BLURRED
              )
              label
              metadata {
                lqip
              }
              url
            }
            crop {
              bottom
              left
              right
              top
            }
            hotspot {
              x
              y
              width
              height
            }
          }
        }
      }
    }
  `);
  data?.allSanityPage.nodes.forEach(
    (page: ArrElement<Queries.GetPagesQuery["allSanityPage"]["nodes"]>) => {
      const slug = page?.slug?.current;
      if (!slug) return;
      if (STATIC_PAGE_SLUGS.has(slug)) return;
      actions.createPage({
        path: slug,
        component: pageTemplate,
        context: { slug },
      });
    },
  );
};

async function getEvents({ graphql, actions }: BuildArgs) {
  const pageTemplate = resolve("./src/templates/Event.tsx");
  const { data }: any = await graphql(`
    query GetEvents {
      allSanityEvent {
        nodes {
          name
          slug {
            current
          }
          content {
            _type
            children {
              _type
              text
            }
          }
          description
          eventAt
          image {
            asset {
              gatsbyImageData(
                width: 500
                layout: CONSTRAINED
                placeholder: BLURRED
              )
            }
          }
        }
      }
    }
  `);
  data?.allSanityEvent.nodes.forEach(
    (event: ArrElement<Queries.GetEventsQuery["allSanityEvent"]["nodes"]>) => {
      if (!event?.slug?.current) {
        return null;
      }
      actions.createPage({
        path: `events/${event.slug.current}`,
        component: pageTemplate,
        context: {
          slug: event.slug.current,
        },
      });
      // Preserve old singular `/event/:slug` URL — redirect to canonical.
      actions.createRedirect({
        fromPath: `/event/${event.slug.current}`,
        toPath: `/events/${event.slug.current}`,
        isPermanent: true,
        redirectInBrowser: true,
      });
    },
  );
}

async function getNews({ graphql, actions }: BuildArgs) {
  const newsTemplate = resolve("./src/templates/NewsArticle.tsx");
  const { data }: any = await graphql(`
    query GetNews {
      allSanityNews {
        nodes {
          slug {
            current
          }
        }
      }
    }
  `);
  data?.allSanityNews.nodes.forEach(
    (article: { slug?: { current?: string | null } | null } | null) => {
      const slug = article?.slug?.current;
      if (!slug) return;
      actions.createPage({
        path: `news/${slug}`,
        component: newsTemplate,
        context: { slug },
      });
    },
  );
}

export const createPages: GatsbyNode["createPages"] = async (params) => {
  await Promise.all([getPages(params), getEvents(params), getNews(params)]);

  // Exact-match redirect: /events → /news-and-events.
  // Detail routes /events/:slug are unaffected because createRedirect uses exact paths.
  params.actions.createRedirect({
    fromPath: "/events",
    toPath: "/news-and-events",
    isPermanent: true,
    redirectInBrowser: true,
  });
  params.actions.createRedirect({
    fromPath: "/events/",
    toPath: "/news-and-events",
    isPermanent: true,
    redirectInBrowser: true,
  });
};
