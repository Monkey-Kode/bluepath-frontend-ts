'use client';

import React, { Dispatch, MouseEvent, SetStateAction, useRef } from "react";
import styled from "styled-components";
import SanityImage from "@/components/SanityImage";
import BlueBox from "@/styles/BlueBox";
import type { ImpactItemsQueryResult } from "@/sanity.types";
// import classNames from 'classnames';
// import scrollTo from '@/lib/scrollTo';
const StyledIcon = styled(SanityImage)`
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
  content: ImpactItemsQueryResult[number];
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
        {image?.asset?._id && (
          <StyledIcon
            image={image}
            alt={`${name} icon`}
            width={50}
          />
        )}
        <StyledH2>{name}</StyledH2>
      </BlueBox>
    </StyledWrap>
  );
}

export default ImpactThumb;
