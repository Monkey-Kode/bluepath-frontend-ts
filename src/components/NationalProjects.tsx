import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "gatsby";
import { getImageComponent } from "../utils/ImageSelector";
import { extractState } from "../utils/extractState";
const StyledNationalProjects = styled.div`
  --color-orange: hsla(34, 85%, 53%, 1);
  --border: 2px solid var(--color-orange);
  --bottom-margin: 1rem;
  background-color: white;
  display: flex;
  flex-direction: column;
  color: var(--blue);
  @media (min-width: 1025px) {
    display: grid;
    grid-template-columns: 1fr 10fr;
    width: 100%;
    align-items: center;
    padding-block: 0;
    padding-inline: 2rem;
    background-color: white;
    padding-block: 0.5rem;
  }
`;

const Heading = styled.h2`
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  font-size: 1rem;
  color: var(--blue);
  font-weight: 700;
  letter-spacing: 0.18em;
  padding-block-start: 2rem;
  text-align: left;
  text-transform: uppercase;
  padding-inline: 0;
  display: flex;
  justify-content: center;
  padding-block-end: 1.5rem;
  border-bottom: var(--border);
  @media (min-width: 1025px) {
    padding-block: 0;
    margin-block: 0;
    padding-inline-end: 2rem;
    border-bottom: none;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    align-items: center;
    border-right: var(--border);
    padding-inline: 0;
    margin-inline-end: 1rem;
  }
  @media (max-width: 1024px) {
    border-top: var(--border);
    padding-block: 0.25rem;
    margin-block-start: 1rem;
  }
`;

const ProjectContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-block-end: 0;
  a {
    padding-block-start: 0;
  }

  @media (min-width: 1025px) {
    flex-direction: row;
  }

  @media (max-width: 1024px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch; // for smoother scrolling on iOS

    & > * {
      flex: 0 0 auto;
      scroll-snap-align: start;
    }
  }
`;

const ProjectColumn = styled.div`
  --project-height: 120px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-inline: 0.5rem;
  position: relative; /* Ensure relative positioning */
  overflow: hidden;
  height: calc(
    var(--project-height) + 1.5rem
  ); /* Set a fixed height to avoid collapsing */
  border-bottom: var(--border);
  @media (min-width: 1025px) {
    border-left: var(--border);
    border-bottom: none;
    height: var(--project-height); /* Set a fixed height to avoid collapsing */
  }
  @media (max-width: 1024px) {
    border-bottom: none;
  }
`;

const ProjectCard = styled.div`
  --font-size: 0.6rem;
  display: grid;
  grid-template-columns: 65% 35%;
  padding-block-start: 0.75rem;
  padding-block-end: 0;
  background-color: #fff;
  text-align: left;
  align-items: flex-start;
  width: 100%;
  height: 100%;
`;

const ProjectImage = styled.figure`
  width: 100%;
  height: auto;
  padding-inline-start: 1rem;
  display: flex;
  align-items: flex-start;
  margin: 0;
  > svg {
    height: 100%;
    max-height: 125px;
    width: 100%;
    object-fit: contain;
    transform: translateY(-5%);
    rect {
      stroke: var(--blue);
    }
  }
`;
const ProjectDetails = styled.p`
  font-size: var(--font-size);
  font-weight: 400;
  color: var(--color-blue);
  line-height: 1.2;
  margin: 0;
  text-transform: uppercase;
  > * {
    margin-block-end: 0.5rem;
  }
`;
const ProjectTitle = styled.h3`
  font-size: var(--font-size);
  font-weight: 400;
  color: var(--color-blue);
  margin: 0;
  text-align: left;
  text-transform: uppercase;
  white-space: wrap;
  overflow: hidden;
  padding-block-end: 0.5rem;
  line-height: 1.25;
`;

export type CaseStudy =
  Queries.HomeMainQuery["allSanityCasestudies"]["nodes"][number];
type NationalProjectsProps = {
  caseStudies: CaseStudy[];
};

// Helper function to chunk the projects into 4 sets.
const chunkProjects = (projects: CaseStudy[], numSets: number) => {
  const sets: CaseStudy[][] = Array.from({ length: numSets }, () => []);
  projects.forEach((project, index) => {
    sets[index % numSets].push(project);
  });
  return sets;
};

const containerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.5,
    },
  },
};

const animationVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

function NationalProjects({ caseStudies }: NationalProjectsProps) {
  const [projectSets, setProjectSets] = useState<CaseStudy[][]>(() =>
    chunkProjects(caseStudies, 4),
  );
  const [currentIndices, setCurrentIndices] = useState([0, 0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndices((prevIndices) => {
        return prevIndices.map(
          (index, i) => (index + 1) % projectSets[i].length,
        );
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [projectSets]);

  return (
    <StyledNationalProjects>
      <Heading>National Projects</Heading>
      <ProjectContainer
        as={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {projectSets.map((projectSet, columnIndex) => (
          <Link
            to="/projects"
            key={columnIndex}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              width: "100%",
            }}
          >
            <ProjectColumn>
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
                      position: "absolute",
                      top: 0,
                      left: "1.5rem",
                      right: "1.5rem",
                      bottom: 0,
                    }}
                  >
                    <ProjectCard>
                      <div>
                        <ProjectTitle>
                          {(() => {
                            const project =
                              projectSet[currentIndices[columnIndex]];
                            const state =
                              project.state || extractState(project.address);
                            return state ? `${state}: ` : "";
                          })()}
                          {projectSet[currentIndices[columnIndex]].entity}
                        </ProjectTitle>
                        <ProjectDetails>
                          <div>
                            {projectSet[
                              currentIndices[columnIndex]
                            ].technologies
                              ?.filter(Boolean)
                              .join(", ")}
                          </div>
                          <div>
                            $
                            {projectSet[
                              currentIndices[columnIndex]
                            ].size?.toLocaleString()}{" "}
                          </div>
                        </ProjectDetails>
                      </div>
                      <ProjectImage>
                        {projectSet[currentIndices[columnIndex]].entity &&
                          getImageComponent(
                            projectSet[currentIndices[columnIndex]].entity,
                          )}
                      </ProjectImage>
                    </ProjectCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </ProjectColumn>
          </Link>
        ))}
      </ProjectContainer>
    </StyledNationalProjects>
  );
}

export default NationalProjects;
