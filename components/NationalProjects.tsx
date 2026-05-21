'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { getImageComponent } from '@/utils/ImageSelector';
import { extractState } from '@/utils/extractState';

export type CaseStudy =
  import('@/sanity.types').CasestudiesQueryResult[number];

type NationalProjectsProps = { caseStudies: CaseStudy[] };

const chunkProjects = (projects: CaseStudy[], numSets: number) => {
  const sets: CaseStudy[][] = Array.from({ length: numSets }, () => []);
  projects.forEach((project, index) => {
    sets[index % numSets].push(project);
  });
  return sets;
};

const containerVariants = {
  visible: {
    transition: { staggerChildren: 0.5 },
  },
};

const animationVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

function NationalProjects({ caseStudies }: NationalProjectsProps) {
  const [projectSets] = useState<CaseStudy[][]>(() =>
    chunkProjects(caseStudies, 4),
  );
  const [currentIndices, setCurrentIndices] = useState([0, 0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndices((prevIndices) =>
        prevIndices.map((index, i) => (index + 1) % projectSets[i].length),
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [projectSets]);

  return (
    <div className="flex flex-col bg-white text-blue px-6 [--border:1px_solid_var(--color-accent)] min-[1025px]:grid min-[1025px]:grid-cols-[auto_1fr] min-[1025px]:w-full min-[1025px]:items-center min-[1025px]:py-4 min-[1025px]:px-8">
      <h2 className="m-0 flex items-center font-sans text-[1.5rem] font-normal uppercase tracking-[0.04em] leading-[1.15] text-blue text-left pr-6 max-[1024px]:border-t-[var(--border)] max-[1024px]:pt-2 max-[1024px]:pb-4 max-[1024px]:mt-4 max-[1024px]:text-center max-[1024px]:justify-center min-[1025px]:max-w-[10ch]">
        National Projects
      </h2>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-between w-full mb-0 min-[1025px]:flex-row max-[1024px]:flex-nowrap max-[1024px]:overflow-x-auto max-[1024px]:snap-x max-[1024px]:snap-mandatory max-[1024px]:[-webkit-overflow-scrolling:touch]"
      >
        {projectSets.map((projectSet, columnIndex) => (
          <Link
            href="/projects"
            key={columnIndex}
            className="pt-0 max-[1024px]:flex-[0_0_auto] max-[1024px]:snap-start"
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              width: '100%',
            }}
          >
            <div className="relative flex flex-1 flex-col items-center text-center px-2 overflow-hidden h-[calc(120px+1.5rem)] border-b-[var(--border)] min-[1025px]:border-l-[var(--border)] min-[1025px]:border-b-0 min-[1025px]:h-[120px] max-[1024px]:border-b-0">
              <AnimatePresence>
                {projectSet[currentIndices[columnIndex]] && (
                  <motion.div
                    key={projectSet[currentIndices[columnIndex]].title}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={animationVariants}
                    transition={{ duration: 1, delay: columnIndex * 0.5 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '1.5rem',
                      right: '1.5rem',
                      bottom: 0,
                    }}
                  >
                    <div className="grid grid-cols-[65%_35%] pt-3 bg-white text-left items-start w-full h-full">
                      <div>
                        <h3 className="font-sans text-[0.6rem] font-normal uppercase text-blue m-0 text-left whitespace-normal overflow-hidden pb-2 leading-[1.25]">
                          {(() => {
                            const project =
                              projectSet[currentIndices[columnIndex]];
                            const state =
                              project.state || extractState(project.address);
                            return state ? `${state}: ` : '';
                          })()}
                          {projectSet[currentIndices[columnIndex]].entity}
                        </h3>
                        <div className="text-[0.6rem] font-normal text-blue leading-[1.2] m-0 uppercase [&>*]:mb-2">
                          <div>
                            {projectSet[
                              currentIndices[columnIndex]
                            ].technologies
                              ?.filter(Boolean)
                              .join(', ')}
                          </div>
                          <div>
                            $
                            {projectSet[
                              currentIndices[columnIndex]
                            ].size?.toLocaleString()}{' '}
                          </div>
                        </div>
                      </div>
                      <figure className="w-full h-auto pl-4 flex items-start m-0 [&>svg]:h-full [&>svg]:max-h-[125px] [&>svg]:w-full [&>svg]:object-contain [&>svg]:-translate-y-[5%] [&>svg_rect]:stroke-blue">
                        {projectSet[currentIndices[columnIndex]].entity &&
                          getImageComponent(
                            projectSet[currentIndices[columnIndex]].entity,
                          )}
                      </figure>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

export default NationalProjects;
