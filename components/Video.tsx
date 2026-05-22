'use client';

import { useEffect, useRef } from 'react';
import getytid from 'get-youtube-id';

import SanityImage from '@/components/SanityImage';
import type {
  HomesectionsQueryResult,
  HomevideoQueryResult,
} from '@/sanity.types';

/**
 * Home hero video. Renders an absolute-fill, muted, looping, controlless
 * background with a black scrim. Designed to sit inside a positioned
 * parent (HomeHero pins it). Source switches between desktop/mobile assets.
 */
function Video({
  videos,
}: {
  content?: HomesectionsQueryResult[number];
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
      videoElement.load();
      videoElement.play().catch(() => {});
    }
  }, []);

  const video = nodes[0];
  if (!video) return null;

  if (video.video || video.mobileVideo) {
    const url = video?.video?.asset?.url;
    const mobileUrl = video?.mobileVideo?.asset?.url;
    const mimeType = video?.video?.asset?.mimeType;
    const mobileMimeType = video?.mobileVideo?.asset?.mimeType;
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <video
          id="home-video"
          ref={videoRef}
          muted
          autoPlay
          playsInline
          loop
          data-src={url}
          data-mobilesrc={mobileUrl}
          data-type={mimeType}
          data-mobiletype={mobileMimeType}
          className="absolute inset-0 h-full w-full bg-black object-cover object-center"
        >
          <source ref={videoSrcRef} />
          {video.videoPoster?.asset?._id && (
            <SanityImage alt="" image={video.videoPoster} />
          )}
        </video>
        {/* Black scrim over the muted autoplay video */}
        <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      </div>
    );
  }

  if (video.youtubeLink) {
    const url = video.youtubeLink?.[0]?.url;
    const id = url && getytid(url);
    if (!id) return null;
    return (
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}`}
          title={video.name ?? 'Main Video'}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          frameBorder="0"
          allowFullScreen
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      </div>
    );
  }

  return null;
}

export default Video;
