import { createGlobalStyle } from "styled-components";
// import arrowRight from '../images/arrow-right.png';
// import arrowLeft from '../images/arrow-left.png';
const GlobalStyles = createGlobalStyle`
    :root{
        --blue: #004181;
        --blue2: rgba(0, 65, 129, .8);
        --blueRGB: rgba(0, 65, 129, .85);
        --orange: #F5AC3F;
        --gray: #6e7c85;
        --gray2: #616567;
        --gray-light: #595959;

        /* Fluid type scale.
           Linear interpolation between mobile (375px) and desktop (1280px).
           Formula: clamp(mobileMin, intercept_rem + slope_vw, desktopMax). */
        --text-display: clamp(2rem, 1.17rem + 3.54vw, 4rem);   /* hero / display */
        --text-h1: clamp(1.75rem, 1.34rem + 1.77vw, 2.75rem);  /* page titles */
        --text-h2: clamp(1.5rem, 1.29rem + 0.88vw, 2rem);      /* section / row titles, body h2 */
        --text-h3: clamp(1.125rem, 0.97rem + 0.66vw, 1.5rem);  /* subheadings, card names */
        --text-eyebrow: clamp(1rem, 0.9rem + 0.44vw, 1.25rem); /* small labels, eyebrows */
        --mobile: 800;
        --tablet: 1024;
        --portrait: 768;
        --phone: 375;
        --desktop: 1025;
        --laptop: 1920px;
        --border-left: 4px solid var(--orange);
        --border-right: 2px solid var(--orange);
        --border-bottom: 2px solid var(--orange);
        --small-content-width: 40vw;
        --mobile-header-height: 153px;
        --header-height: 100px;
        --big-heading-size: 8.27rem;
        --small-heading-size: 2.405625rem;
        --big-heading-padding: .5rem;
        --box-width: 725px;
        --white: #fff;
    }


    html , body{
        overflow-x: hidden;
        width: 100%;
        padding: 0;
        margin:0;
        box-sizing: border-box;
        scroll-behavior: smooth;
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
        scroll-snap-align: start;
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


    main{
        scroll-snap-type: mandatory;
        scroll-snap-points-y: repeat(100vh);
        scroll-snap-type: y mandatory;
        > * {
            scroll-snap-align: start;
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
        background-color: var(--orange);
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

    .hidden {
        display: none;
    }

`;

export default GlobalStyles;
