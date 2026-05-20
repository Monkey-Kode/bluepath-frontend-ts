'use client';

import { MouseEvent, useEffect, useRef } from 'react';
import getytid from 'get-youtube-id';

import TriangleOutline from '@/assets/triangle-outline.svg';
import scrollTo from '@/lib/scrollTo';
import SanityImage from '@/components/SanityImage';
import type {
  HomesectionsQueryResult,
  HomevideoQueryResult,
} from '@/sanity.types';

const SOUND_BUTTON_CLASS =
  'bg-transparent p-2 flex flex-row flex-nowrap items-center [&_svg]:pointer-events-none [&_svg]:opacity-80 [&_svg]:fill-white [&_svg.jump-down]:w-[35px] [&_svg.jump-down]:h-auto [&_svg.jump-down]:-translate-y-0.5 [&_#mute-icon]:text-white [&_#mute-icon]:font-normal [&_#mute-icon]:text-base [&_#mute-icon]:pointer-events-none [&_#sound-icon]:text-white [&_#sound-icon]:font-normal [&_#sound-icon]:text-base [&_#sound-icon]:pointer-events-none data-[state=mute]:[&_#mute-icon]:hidden data-[state=unmute]:[&_#sound-icon]:hidden';

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
      const desktopMq = window.matchMedia('(min-width: 800px)');
      if (desktopMq.matches) {
        videoSrcElement.type = videoElement.dataset.type || 'video/mp4';
        videoSrcElement.src = videoElement.dataset.src || '';
      } else {
        videoSrcElement.type = videoElement.dataset.mobiletype || 'video/mp4';
        videoSrcElement.src = videoElement.dataset.mobilesrc || '';
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
        target.setAttribute('data-state', video.muted ? 'mute' : 'unmute');
      }
    }
  };

  const video = nodes[0];

  if (video.video || video.mobileVideo) {
    const url = video?.video?.asset?.url;
    const mobileUrl = video?.mobileVideo?.asset?.url;
    const mimeType = video?.video?.asset?.mimeType;
    const mobileMimeType = video?.mobileVideo?.asset?.mimeType;
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <div className="sound-button absolute z-[2] cursor-pointer right-[2%] bottom-[2%] flex flex-row flex-nowrap items-center">
          <button
            type="button"
            data-state="mute"
            onClick={setSound}
            className={SOUND_BUTTON_CLASS}
          >
            <Sound />
            <Mute />
          </button>
          <button
            type="button"
            className={`jump-button ${SOUND_BUTTON_CLASS}`}
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              if (typeof window !== 'undefined') {
                const mql = window.matchMedia('(max-width: 800px)');
                if (!mql.matches) scrollTo('#carousel');
                else scrollTo('#bottom-video');
              }
            }}
          >
            <TriangleOutline className="jump-down" />
          </button>
        </div>
        <video
          id="home-video"
          ref={videoRef}
          muted
          autoPlay
          playsInline
          width="100%"
          height="100%"
          data-src={url}
          data-mobilesrc={mobileUrl}
          data-type={mimeType}
          data-mobiletype={mobileMimeType}
          className="block w-full max-w-screen mb-0 relative z-[1] h-full bg-black object-cover object-center"
        >
          <source ref={videoSrcRef} />
          Sorry, your browser doesn&apos;t support embedded videos.
          {video.videoPoster?.asset?._id && (
            <SanityImage
              alt="Windows of a building"
              image={video.videoPoster}
            />
          )}
        </video>
        <div id="bottom-video" />
      </div>
    );
  } else if (video.youtubeLink) {
    const videos = nodes.flatMap((v) => ({
      name: v.name,
      url: v.youtubeLink?.[0]?.url,
    }));
    const { name, url } = videos?.[0];
    const id = url && getytid(url);
    return (
      <section id={`#${content.anchorId}`}>
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={name ?? 'Main Video'}
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
