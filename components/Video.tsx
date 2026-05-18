'use client';

import React, { MouseEvent, useEffect, useRef } from "react";
import getytid from "get-youtube-id";
import styled from "styled-components";
import TriangleOutline from "@/assets/triangle-outline.svg";
import scrollTo from "@/lib/scrollTo";
import SanityImage from "@/components/SanityImage";
import type {
  HomesectionsQueryResult,
  HomevideoQueryResult,
} from "@/sanity.types";
const StyledVideo = styled.video`
  display: block;
  width: 100%;
  max-width: 100vw;
  margin-bottom: 0;
  position: relative;
  z-index: 1;
  height: 100%;
  background-color: black;
  object-fit: cover;
  object-position: center center;
`;

const VideoSection = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

const StyledButtonsWrapper = styled.div`
  position: absolute;
  z-index: 2;
  cursor: pointer;
  right: 2%;
  bottom: 2%;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
`;

const StyledSoundButton = styled.button`
  background: none;
  padding: 0.5rem;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  svg {
    pointer-events: none;
    opacity: 0.8;
    fill: white;
    &.jump-down {
      width: 35px;
      height: auto;
      transform: translateY(-2px);
    }
  }
  #mute-icon,
  #sound-icon {
    color: white;
    font-weight: 400;
    font-size: 1rem;
    pointer-events: none;
  }
  &[data-state="mute"] {
    #mute-icon {
      display: none;
    }
  }
  &[data-state="unmute"] {
    #sound-icon {
      display: none;
    }
  }
`;

function Sound() {
  return <span id="sound-icon">UNMUTE</span>;
}
function Mute() {
  return <span id="mute-icon">MUTE</span>;
}

function Video({
  content,
  videos,
}: {
  content: HomesectionsQueryResult[number];
  videos: HomevideoQueryResult;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrcRef = useRef<HTMLSourceElement>(null);
  const nodes = videos;

  useEffect(() => {
    const videoElement = videoRef.current;
    const videoSrcElement = videoSrcRef.current;
    if (videoSrcElement && videoElement) {
      const desktopMq = window.matchMedia("(min-width: 800px)");
      if (desktopMq.matches) {
        videoSrcElement.type = videoElement.dataset.type || "video/mp4";
        videoSrcElement.src = videoElement.dataset.src || "";
        // videoDesktopSource.play();
      } else {
        videoSrcElement.type = videoElement.dataset.mobiletype || "video/mp4";
        videoSrcElement.src = videoElement.dataset.mobilesrc || "";
      }
      videoElement.play();
    }
  }, [videoRef]);

  const setSound = (e: MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLButtonElement;
    if (videoRef) {
      const video = videoRef.current;

      if (video) {
        video.muted = !video.muted;
        target.setAttribute("data-state", video.muted ? "mute" : "unmute");
      }
    }
  };

  const video = nodes[0];

  if (video.video || video.mobileVideo) {
    // const name = video.name;
    const url = video?.video?.asset?.url;
    const mobileUrl = video?.mobileVideo?.asset?.url;
    const mimeType = video?.video?.asset?.mimeType;
    const mobileMimeType = video?.mobileVideo?.asset?.mimeType;
    return (
      <VideoSection>
        <StyledButtonsWrapper className="sound-button">
          <StyledSoundButton data-state="mute" onClick={setSound}>
            <Sound />
            <Mute />
          </StyledSoundButton>
          <StyledSoundButton
            className="jump-button"
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              // const video = videoRef.current;
              // video.pause();
              if (typeof window !== "undefined") {
                const mql = window.matchMedia("(max-width: 800px)");
                if (!mql.matches) {
                  scrollTo("#carousel");
                } else {
                  scrollTo("#bottom-video");
                }
              }
            }}
          >
            <TriangleOutline className="jump-down" />
            {/* <TriangleFull className="jump-down" /> */}
          </StyledSoundButton>
        </StyledButtonsWrapper>
        <StyledVideo
          id="home-video"
          width="100%"
          height="100%"
          ref={videoRef}
          muted
          autoPlay
          data-src={url}
          data-mobilesrc={mobileUrl}
          data-type={mimeType}
          data-mobiletype={mobileMimeType}
          playsInline
        >
          <source ref={videoSrcRef}></source>
          Sorry, your browser doesn't support embedded videos.
          {video.videoPoster?.asset?._id && (
            <SanityImage
              alt="Windows of a building"
              image={video.videoPoster}
            />
          )}
        </StyledVideo>
        <div id="bottom-video"></div>
      </VideoSection>
    );
  } else if (video.youtubeLink) {
    const videos = nodes.flatMap((video) => ({
      name: video.name,
      url: video.youtubeLink?.[0]?.url,
    }));
    const { name, url } = videos?.[0];
    const id = url && getytid(url);
    return (
      <section id={`#${content.anchorId}`}>
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={name ?? "Main Video"}
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          frameBorder="0"
          allowFullScreen
        />
      </section>
    );
  }
  return null;
}

export default Video;
