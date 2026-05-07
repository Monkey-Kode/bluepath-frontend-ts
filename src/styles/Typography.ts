import { createGlobalStyle } from 'styled-components';
import { typographyStyles } from '../utils/typography';

const Typography = createGlobalStyle`
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

export default Typography;
