'use client';

import { motion } from 'framer-motion';

import formatNumber from '@/utils/formatNumber';
import type { ImpactItemsQueryResult } from '@/sanity.types';

function boxHeading(heading: string | number | null | undefined) {
  if (!heading || heading === 'null') return '';
  return (
    <h3 className='text-white'>{isNaN(Number(heading)) ? heading : formatNumber(Number(heading))}</h3>
  );
}

function ImpactContent({
  content,
}: {
  content: ImpactItemsQueryResult[number];
}) {
  const {
    content1,
    contentheading1,
    content2,
    contentheading2,
    content3,
    contentheading3,
    content4,
    contentheading4,
  } = content;

  return (
    <motion.div
      initial={{ opacity: 0, y: '110%' }}
      animate={{ opacity: 1, y: '0%' }}
      exit={{ opacity: 0 }}
    >
      <div
        id="impact-boxes"
        className="bg-blue p-4 transition-opacity duration-[400ms] my-12 mx-auto [&_h3]:m-0 [&_h3]:font-thin [&_p]:m-0 [&_p]:leading-[1.3] [&_p]:font-thin [&_>div]:flex [&_>div]:flex-col [&_>div]:justify-start [&_>div]:items-center max-tablet:flex max-tablet:flex-col max-tablet:flex-nowrap max-tablet:justify-around max-tablet:items-center max-tablet:m-0 max-tablet:mx-auto max-tablet:max-w-[80vw] max-tablet:[&_>div]:p-4 max-tablet:[&_button]:flex-[1_50%] max-tablet:[&_button]:max-w-[calc(50%-0.5em)] max-tablet:[&_button]:mb-[1em] max-tablet:[&_button_p]:text-[3.5vw] max-tablet:[&_>div:first-child_p]:text-center min-tablet:grid min-tablet:grid-flow-col min-tablet:max-w-[800px] min-tablet:gap-2.5"
      >
        <div>
          {boxHeading(String(contentheading1))}
          {content1 && (
            <p className="text-white !font-extrabold text-xs text-left min-[1280px]:text-right">
              {content1}
            </p>
          )}
        </div>
        <div>
          {boxHeading(String(contentheading2))}
          {content2 && <p className='text-white'>{content2}</p>}
        </div>
        <div>
          {boxHeading(String(contentheading3))}
          {content2 && <p className='text-white'>{content3}</p>}
        </div>
        <div>
          {boxHeading(String(contentheading4))}
          {content4 && <p className='text-white'>{content4}</p>}
        </div>
      </div>
    </motion.div>
  );
}

export default ImpactContent;
