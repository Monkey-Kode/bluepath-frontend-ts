import { graphql, useStaticQuery } from "gatsby";
import React, { FC } from "react";
import logo from "../images/1200w/logo-1200-cropped.png";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  location?: Location;
  children?: React.ReactNode;
}

const SEO: FC<SEOProps> = ({
  children,
  location,
  description,
  title,
  image,
}) => {
  const { site } = useStaticQuery(graphql`
    query SEO {
      site {
        siteMetadata {
          title
          description
        }
      }
    }
  `);

  const siteUrl =
    typeof window !== "undefined" && process.env.NODE_ENV === "production"
      ? window.location.href
      : typeof window !== "undefined" && process.env.NODE_ENV === "development"
        ? "http://localhost:8000/"
        : "https://bluepathfinance.com/";

  const seoTitle = title ?? site?.siteMetadata?.title ?? "Bluepath Finance";
  const seoDescription = description ?? site?.siteMetadata?.description ?? "";
  const seoLogo = image ?? `${siteUrl}${logo.slice(1)}` ?? "";

  return (
    <>
      <html lang="en" />
      <title>{seoTitle}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <meta name="description" content={seoDescription} />
      {location && <meta property="og:url" content={location.href} />}
      <meta name="title" property="og:title" content={seoTitle} />
      <meta name="type" property="og:type" content="website" />
      <meta name="image" property="og:image" content={seoLogo} />
      <meta
        name="image_secureurl"
        property="og:image:secure_url"
        content={seoLogo}
      />
      <meta name="image_type" property="og:image:type" content={"image/png"} />
      <meta name="image_width" property="og:image:width" content={"336"} />
      <meta name="image_height" property="og:image:height" content={"176"} />
      <meta
        name="image_alt"
        property="og:image:alt"
        content={"Bluepath Finance"}
      />
      <meta
        name="sitename"
        property="og:site_name"
        content={seoTitle}
        key="ogsitename"
      />
      <meta
        name="og_description"
        property="og:description"
        content={seoDescription}
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@BluePathFinance" />
      <meta name="twitter:creator" content="@BluePathFinance" />
      <meta name="twitter:title" content={seoTitle} key="twittertitle" />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoLogo} />
      <meta name="twitter:image:alt" content={"Bluepath Finance"} />
      <meta name="twitter:image:width" content={"336"} />
      <meta name="twitter:image:height" content={"176"} />
      {children}
    </>
  );
};
export default SEO;
