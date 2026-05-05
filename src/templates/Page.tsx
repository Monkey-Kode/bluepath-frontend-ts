import React from 'react';
import { graphql, HeadProps, PageProps } from 'gatsby';
import Header from '../components/Header';
import Footer from '../components/Footer';
import IndividualPageContent from '../components/IndividualPageContent';
import Impact from '../components/Impact';
import SEO from '../components/SEO';
import Form from '../components/Form';
import Contact from '../components/Contact';
import Projects from '../components/Projects';
import Team from '../components/Team';
function innerContent(
  contentType: string | null | undefined,
  sanityPage: Queries.SanityPage
) {
  if (contentType && sanityPage) {
    if (contentType === 'Form') {
      return <Form sanityPage={sanityPage} />;
    } else if (contentType === 'Connect') {
      return <Contact sanityPage={sanityPage} />;
    } else if (contentType === 'Impact') {
      return <Impact sanityPage={sanityPage} />;
    } else if (contentType === 'Projects') {
      return <Projects sanityPage={sanityPage} />;
    } else if (contentType === 'Team') {
      return <Team sanityPage={sanityPage} />;
    } else {
      return <IndividualPageContent sanityPage={sanityPage} />;
    }
  }
}
const Page = ({
  data: { sanityPage },
  location,
}: PageProps<Queries.PageQuery>) => {
  const contentType = sanityPage?.contentType?.name;
  return (
    <div className="page">
      <Header location={location} />
      {innerContent(contentType, sanityPage as Queries.SanityPage)}
      <Footer location={location} />
    </div>
  );
};

export const Head = ({ data: { sanityPage } }: HeadProps<Queries.PageQuery>) => (
  <SEO
    title={sanityPage?.seotitle ?? 'Page'}
    description={sanityPage?.description ?? undefined}
  />
);
export const query = graphql`
  query Page($slug: String!) {
    sanityPage(slug: { current: { eq: $slug } }) {
      _id
      contentType {
        name
        id
      }
      Heading
      sectionHeadingPosition
      background {
        asset {
          gatsbyImageData(width: 2000, layout: CONSTRAINED)
        }
      }
      mobilebackground {
        asset {
          gatsbyImageData(width: 600, placeholder: BLURRED, layout: CONSTRAINED)
          id
        }
      }
      boxLocation
      backgroundColor {
        hex
      }
      content
      richcontent {
        children {
          _key
          _type
          marks
          text
        }
        list
        style
        _type
        _key
      }
      description
      hidetitle
      id
      name
      sectionContentCTAtext
      sectionContentCTAjumpId
      sectionContentCTApageLink {
        slug {
          current
        }
      }
      sectionContentCTAurl
      seotitle
      slug {
        current
      }
    }
  }
`;

export default Page;
