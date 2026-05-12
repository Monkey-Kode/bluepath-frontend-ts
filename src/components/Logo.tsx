import { Link } from "gatsby";
import scrollTo from "gatsby-plugin-smoothscroll";
import React, { MouseEvent } from "react";
import DarkLogo from "../images/dark-logo336.svg";
import LightLogo from "../images/light-logo.svg";

interface LogoProps {
  image: Queries.SanityImage;
  className: "light-logo" | "dark-logo";
}

function Logo({ image, className }: LogoProps) {
  if (!image) {
    return null;
  }

  const LogoComponent = className === "light-logo" ? LightLogo : DarkLogo;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      scrollTo("#tof");
    }
  };

  return (
    <Link className={className} to="/#tof" onClick={handleClick}>
      <LogoComponent className="no-pixel" />
    </Link>
  );
}

export default Logo;
