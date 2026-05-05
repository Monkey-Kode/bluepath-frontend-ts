import { GatsbyImage } from "gatsby-plugin-image";
import React, { Dispatch, MouseEvent, SetStateAction, useRef } from "react";
import styled from "styled-components";
import BlueBox from "../styles/BlueBox";
import { ArrElement } from "../types";
// import classNames from 'classnames';
// import scrollTo from 'gatsby-plugin-smoothscroll';
const StyledIcon = styled(GatsbyImage)`
  @media only screen and (max-width: 800px) {
    min-height: 60px;
    min-width: 60px;
  }
`;
const StyledWrap = styled.div``;
const StyledH2 = styled.h2`
  font-size: 1rem;
  line-height: 1.2;
  pointer-events: none;
`;
function ImpactThumb({
  className,
  setFirstClick,
  setActiveBtn,
  id,
  content: { image, name, id: idInfo },
  setCurrentThumb,
  currentThumb,
}: {
  className: string;
  setFirstClick: Dispatch<SetStateAction<boolean>>;
  setActiveBtn: Dispatch<SetStateAction<string>>;
  id: string;
  content: ArrElement<Queries.ImpactQuery["allSanityImpact"]["nodes"]>;
  setCurrentThumb: Dispatch<SetStateAction<string>>;
  currentThumb: string;
}) {
  const ref = useRef<HTMLDivElement>(null); // Initialize with null

  return (
    <StyledWrap id={id} ref={ref} className={className}>
      <BlueBox
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          // Simplified type
          setActiveBtn(currentThumb);
          setCurrentThumb(idInfo);
          setFirstClick(false);
        }}
      >
        {image?.asset?.gatsbyImageData && (
          <StyledIcon
            image={image.asset.gatsbyImageData}
            alt={`${name} icon`}
          />
        )}
        <StyledH2>{name}</StyledH2>
      </BlueBox>
    </StyledWrap>
  );
}

export default ImpactThumb;
