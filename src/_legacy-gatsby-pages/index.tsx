import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import Footer from "../components/Footer";
import Header from "../components/Header";
import HomeMain from "../components/HomeMain";
import type { HeadFC, PageProps } from "gatsby";
import SEO from "../components/SEO";
import { useInView } from "react-intersection-observer";

const StyledHeaderWrapper = styled.div`
  z-index: 100;
  header {
    background-color: transparent;
    box-shadow: none;
    .burger-menu {
      div {
        background-color: white;
      }
    }
    .dark-logo {
      display: none;
    }
    .light-logo {
      display: block;
    }
    nav ul li a {
      color: #fff;
      font-weight: 100;
    }
    &.show {
      background-color: var(--white);
      .burger-menu:not(.open) {
        div {
          background-color: var(--blue);
        }
      }
      .dark-logo {
        display: block;
      }
      .light-logo {
        display: none;
      }
      @media only screen and (min-width: 800px) {
        nav ul li a {
          color: var(--blue);
          font-weight: 400;
        }
      }
    }
  }
`;

const IndexPage = ({ location }: PageProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const footerRef = useInView({ threshold: 0.5 });
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScroll = () => {
    const header = ref?.current?.querySelector("header");
    if (window.scrollY > 0) {
      header?.classList.remove("hide");
      header?.classList.add("show");
      // console.log(window.scrollY);
    } else {
      header?.classList.remove("show");
      header?.classList.add("hide");
    }
  };
  return (
    <div className="home">
      <StyledHeaderWrapper ref={ref}>
        <Header location={location} />
      </StyledHeaderWrapper>
      <HomeMain footerRef={footerRef} />
      <Footer location={location} ref={footerRef.ref} />
    </div>
  );
};

export const Head: HeadFC = () => <SEO />;

export default IndexPage;
