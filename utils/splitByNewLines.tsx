import { Fragment } from 'react';

const splitByNewLines = function (content: string) {
  if (content) {
    return content.split('\n').map((item, idx) => {
      return (
        <Fragment key={idx}>
          {item}
          <br />
        </Fragment>
      );
    });
  }
};
export default splitByNewLines;
