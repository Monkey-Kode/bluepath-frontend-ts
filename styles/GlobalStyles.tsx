'use client';

import { createGlobalStyle } from 'styled-components';
import { typographyStyles } from '@/styles/typography';

const BaseGlobalStyles = createGlobalStyle`
    :root{
        --blue: #004181;
        --blue2: rgba(0, 65, 129, .8);
        --blueRGB: rgba(0, 65, 129, .85);
        --accent: #168FCB;
        --gray: #6e7c85;
        --gray2: #616567;
        --gray-light: #595959;

        /* Fluid type scale.
           Linear interpolation between mobile (375px) and desktop (1280px).
           Formula: clamp(mobileMin, intercept_rem + slope_vw, desktopMax). */
        --text-display: clamp(2rem, 1.17rem + 3.54vw, 3rem);   /* hero / display */
        --text-h1: clamp(1.75rem, 1.34rem + 1.77vw, 2.75rem);  /* page titles */
        --text-h2: clamp(1.5rem, 1.29rem + 0.88vw, 2rem);      /* section / row titles, body h2 */
        --text-h3: clamp(1.125rem, 0.97rem + 0.66vw, 1.25rem);  /* subheadings, card names */
        --text-h4: clamp(1rem, 0.95rem + 0.22vw, 1.125rem); /* body copy, small headings */
        --text-eyebrow: clamp(1rem, 0.9rem + 0.44vw, 1rem); /* small labels, eyebrows */
        --text-fine: clamp(0.75rem, 0.7rem + 0.22vw, 0.875rem); /* fine print, captions */
        --text-micro: clamp(0.625rem, 0.57rem + 0.22vw, 0.75rem); /* micro labels, smallest */
        --mobile: 800;
        --tablet: 1024;
        --portrait: 768;
        --phone: 375;
        --desktop: 1025;
        --laptop: 1920px;
        --border-left: 4px solid var(--accent);
        --border-right: 2px solid var(--accent);
        --border-bottom: 2px solid var(--accent);
        --small-content-width: 40vw;
        --mobile-header-height: 153px;
        --header-height: 100px;
        --big-heading-size: 8.27rem;
        --small-heading-size: 2.405625rem;
        --big-heading-padding: .5rem;
        --box-width: 725px;
        --white: #fff;
        --surface-muted: #f6f7f9;
    }


    html , body{
        overflow-x: hidden;
        width: 100%;
        padding: 0;
        margin:0;
        box-sizing: border-box;
        scroll-behavior: smooth;
    }

    html {
        scroll-padding-top: var(--header-height);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      overflow-x: hidden;
      width: 100%;
    }

    .gatsby-image-wrapper::not(.no-pixel) img[src*=base64\\,] {
        image-rendering: -moz-crisp-edges;
        image-rendering: pixelated;


    }

    img {
        max-width: 100%;
    }
    section {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 2vw;
        width: 100vw;

        @media only screen and ( max-width: 800px) {
            display: block;
            padding: 0px;
        }
        @media only screen and ( min-width: 801px) {
          min-height: 100vh;
        }
        > div {
            width: 100%;
        }
        > div:not(.team-wrapper):not([class*="Contact"]):not([class*="Impact"]){
            display: flex;
            align-items:center;
            height: 100%;
            @media only screen and ( max-width: 800px) {
                background-color: var(--blue);
                margin-inline: auto;
            }
        }

    }

    a {
        color: var(--blue);
    }

    .wrap {
        max-width: var(--laptop);
        margin: 0 auto;
        width: 100%;
    }

    .box {
        padding: 0 0 1rem;
        background: var(--blueRGB);
        &.Terms, &.Privacy {
            @media only screen and (min-width: 480px) {
                margin-top: 135px;
            }
        }
        @media only screen and (max-width: 480px) {
           margin: 0 auto;
        }
        * {
            color: white;
        }
        h2 {
            font-size: var(--big-heading-size);
            text-align: center;
            color: white;
            @media only screen and (max-width: 800px) {
                --big-heading-size:  clamp(1rem, 7cqi + 1rem, 2.5rem);
                line-height: 1;
                padding-left: 0.5rem;
                padding-right: 0.5rem;
            }
        }
        p {
            color:white;
            margin: 0;
        }
    }

    .hide-for-desktop {
        display: none !important;
        @media only screen and (max-width: 800px) {
            display: block !important;
        }
    }
    .hide-for-mobile {
        display: block !important;
        @media only screen and ( max-width: 799px) {
            display: none !important;
        }
    }


    form {
        p {
            padding: .5rem;
            margin: 0;
        }
    }

    input , textarea, select{
        appearance: none;
        background-color: white;
        border: none;
        width: 100%;
        padding: 0.4rem;
        &::placeholder{
            text-transform: uppercase;
        }
    }
    input[type="submit"], button{
        background-color: var(--accent);
        appearance: none;
        border: none;
        padding: .5rem 1.3rem;
    }
    button {
        cursor: pointer;
    }
    button:focus{
        outline: 0;

    }

    span {
    color: white;
    }
    a {

        display: block;
        padding-top: 10px;
        text-transform: none !important;
    }

    .box {
        p {
            text-align: justify;
            line-height: 1.9;
            font-size: 1rem;
            line-height: 1.5rem;
            font-weight: 300;
            @media only screen and (max-width: 800px) {
                text-align: left;
            }
        }
        a {
            font-weight: 400;
            color: white
        }
    }

    .left, .right {
        display: flex;
        flex-direction: column;
    }

    .left {
        justify-content: flex-start;
     }
    .right {
        .inactive {
            h2 {
                opacity: 0;
            }
        }
            justify-content: flex-end;
            .box {
                h2 {
                    text-align: center;

                }
            }


     }
    .center {

            justify-content: center;


     }


    .page {
        section {
            padding: calc( var(--mobile-header-height) + 2rem) 5% 5%;

        }
        @media only screen and ( max-width: 799px) {
            .hide-for-desktop.image-atop + section {
                padding-top: 10%;
            }
            .hide-for-desktop.image-atop {
                padding-top: var(--mobile-header-height);
            }
        }
        .light-logo {
            display:none;
        }
    }

    .box {
        width: var(--box-width) ;
        @media only screen and ( max-width: 800px) {
            width: auto;
            max-width: 100%;

            p {
                font-size: .75rem;
            }
        }
    }

    .alignfull {
        margin: 0 calc(50% - 50vw);
        max-width: 100vw;
        width: 100vw;
    }

    .home .box {
        background: var(--white);
        * { color: var(--blue); }
        h2, h3 { color: var(--blue); }
        p { color: #000; }
        a { color: var(--blue); }
    }

    .light-logo {
        display: none;
    }

    .hidden {
        display: none;
    }

    /* Team grid card ⇄ bio hero shared-element morph (share="morph"). */
    ::view-transition-group(.morph) {
        animation-duration: 380ms;
        animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    }
    ::view-transition-image-pair(.morph) {
        animation-name: vt-morph-blur;
    }
    @keyframes vt-morph-blur {
        30% {
            filter: blur(3px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        ::view-transition-old(*),
        ::view-transition-new(*),
        ::view-transition-group(*) {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
        }
    }
`;

const TypographyStyles = createGlobalStyle`
    ${typographyStyles}

    body *{
        letter-spacing: normal;
    }
    p, h1, h2, h3, h4, h5{
        color: white;

    }
    p {
        line-height: 1.75;
        font:1rem
    }
    a {
        text-transform: uppercase;
        text-decoration: none;
        font-weight: bold;
    }
    h2 {
        font-size: 2rem;
    }

    @media only screen and (max-width: 800px) {
        h1 {
            font-size: 5.5vw;
            max-width: 100vw;
        }
        h2 {
            font-size: 1.4rem;
            margin-bottom: .8rem;
        }

    }
`;

const MapStyles = createGlobalStyle`
    .gm-style .gm-ui-hover-effect img {
        filter: invert(1);
        transform: scale(2) translate(-5px, 5px);
    }
    .gm-style .gm-style-iw-c{
        border-radius:0 !important;
        background-color: var(--blue);
        padding: 0 !important;
        transform: scale(.5) translate(-115%,-52%) !important;
        transform-origin: 0% 0%;
        * {
            color: white;

        }

        #content {
            max-width: 380px;
            #siteNotice {
                text-align: center;
                text-transform:uppercase;

                h3{
                    margin-bottom: 0;
                    padding: 0 0 .3rem;
                    font-weight: 300;
                    font-size: 1.2rem;

                }
                p{
                    font-weight:bold;
                    font-size: 1.3rem;
                    padding:0;
                    margin: 0;
                    line-height: 1.25;
                    @media only screen and (max-width: 480px) {
                        font-size: .8rem;
                    }

                }
                .image  {
                    background-color: var(--gray2);
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items:center;
                    border-bottom: 1px solid var(--accent);
                    flex-flow:column wrap;
                    padding: 8%;
                    svg, img {
                        max-width: 180px;
                        display: block;
                        flex: 1 auto;

                    }

                }
                .line-content{
                    padding: .7rem 1.3rem;
                }
                .content {
                    padding: 0.5rem 1rem 1.5rem;
                }
                .list-title {
                    font-weight: bold;
                    text-transform: uppercase;
                }
            }
        }

    }
    .gm-style-iw-d{
        overflow: hidden !important;
    }
    .gm-style .gm-style-iw-t::after {
        background: var(--blue) !important;
        transform: translate(-36px,18px) rotate(-45deg);
        box-shadow: none;
    }
    #markerLayer img {
        transform-origin: center;
        transform: scale(.5);
        transition: transform .35s ease-out;
        &.grow {
            transform: scale(1);
            transition: transform .35s ease-out;
        }
        &.shrink {
            transform: scale(.5);
            transition: transform .35s ease-out;
        }
    }
`;

export default function GlobalStyles() {
  return (
    <>
      <BaseGlobalStyles />
      <TypographyStyles />
      <MapStyles />
    </>
  );
}
