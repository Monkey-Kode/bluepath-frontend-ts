import { createGlobalStyle } from 'styled-components';

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

export default MapStyles;
