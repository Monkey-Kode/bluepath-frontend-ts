import React from "react";
import Carousel from "./Carousel";
import Plain from "./Plain";
import Projects from "./Projects";
import Video from "./Video";
import Team from "./Team";
import { ArrElement } from "../types";
import TableOfContents from "./TableOfContents";
import { CaseStudy } from "./NationalProjects";
import { InViewHookResponse } from "react-intersection-observer";

function PageContent({
  content,
  caseStudies,
  tableOfContentsRef,
}: {
  content: ArrElement<Queries.HomeMainQuery["allSanityHomesections"]["nodes"]>;
  caseStudies: CaseStudy[];
  tableOfContentsRef?: InViewHookResponse;
}) {
  const contentType = content?.contentType?.name;
  // console.log(contentType);
  if (contentType === "Video") {
    return <Video key={content.id} content={content} />;
  } else if (contentType === "Carousel") {
    return <Carousel key={content.id} content={content} />;
  } else if (contentType === "Projects") {
    return <Projects key={content.id} sanityPage={content} />;
  } else if (contentType === "Team") {
    // @ts-ignore
    return <Team key={content.id} sanityPage={content} />;
  } else if (contentType === "TOF") {
    return (
      tableOfContentsRef?.ref && (
        <TableOfContents
          key={content.id}
          content={content}
          tableOfContentsRef={tableOfContentsRef}
        />
      )
    );
  } else {
    return <Plain key={content.id} content={content} />;
  }
}

export default PageContent;
