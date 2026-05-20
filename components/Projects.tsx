'use client';

import { useRef, useEffect } from 'react';
import { renderToString } from 'react-dom/server';

import InfoWindow from './InfoWindow';
import { loader } from '@/lib/mapsLoader';

import type {
  CasestudiesQueryResult,
  PageBySlugQueryResult,
} from '@/sanity.types';

const mapMarker = '/marker.png';

function Projects({
  page,
  casestudies,
}: {
  page: NonNullable<PageBySlugQueryResult>;
  casestudies: CasestudiesQueryResult;
}) {
  const { id } = page;
  const projects = casestudies;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 600px)');
    const mapOptions = {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 5,
      mapId: 'f909f5ad32968c2a',
    };

    if (mql.matches) mapOptions.zoom = 3.5;

    loader
      .load()
      .then(() => {
        if (!ref.current) {
          console.error('Map container ref is not available');
          return;
        }

        let activeInfoWindow: any;
        const allMarkers: google.maps.Marker[] = [];
        const map = new window.google.maps.Map(ref.current, mapOptions);

        projects.forEach((project) => {
          if (!project.location?.lat || !project.location?.lng) {
            console.warn('Skipping project with missing location:', project.id);
            return;
          }

          const infowindow = new window.google.maps.InfoWindow({
            content: renderToString(<InfoWindow project={project} />),
          });
          const iconSize = 15;

          const icon = {
            url: mapMarker,
            size: new window.google.maps.Size(iconSize, iconSize),
            origin: new window.google.maps.Point(0, 0),
            anchor: new window.google.maps.Point(0, 0),
          };
          const marker = new window.google.maps.Marker({
            position: project.location as google.maps.LatLngLiteral,
            map,
            title: allMarkers.length.toString(),
            icon,
          });

          allMarkers.push(marker);

          const myoverlay = new window.google.maps.OverlayView();
          myoverlay.draw = function (this: google.maps.OverlayView) {
            const panes = this.getPanes();
            if (panes) panes.markerLayer.id = 'markerLayer';
          };
          myoverlay.setMap(map);

          marker.addListener(
            'click',
            function (this: google.maps.MarkerOptions) {
              const thisTitle = Number(this.title);
              const index = thisTitle + 2;
              document
                .querySelectorAll(`#markerLayer div img`)
                .forEach((img) => {
                  img.classList.remove('grow');
                  img.classList.remove('shrink');
                });

              if (activeInfoWindow) activeInfoWindow.close();
              infowindow.open(map, marker);
              activeInfoWindow = infowindow;

              const markerElement = document.querySelector(
                `#markerLayer div:nth-child(${index}) img`,
              );
              markerElement?.classList.add('grow');
            },
          );

          marker.addListener(
            'mouseover',
            function (this: google.maps.MarkerOptions) {
              const thisTitle = Number(this.title);
              const index = thisTitle + 2;
              if (!activeInfoWindow) {
                const image = document.querySelector(
                  `#markerLayer div:nth-child(${index}) img`,
                );
                image?.classList.remove('shrink');
                image?.classList.add('grow');
              }
            },
          );

          marker.addListener(
            'mouseout',
            function (this: google.maps.MarkerOptions) {
              const thisTitle = Number(this.title);
              const index = thisTitle + 2;
              if (!activeInfoWindow) {
                const image = document.querySelector(
                  `#markerLayer div:nth-child(${index}) img`,
                );
                image?.classList.remove('grow');
                image?.classList.add('shrink');
                image?.classList.remove('shrink');
              }
            },
          );

          infowindow.addListener('closeclick', function () {
            document
              .querySelectorAll(`#markerLayer div img`)
              .forEach((img) => {
                img.classList.remove('grow');
                img.classList.remove('shrink');
              });
            activeInfoWindow = null;
          });
        });
      })
      .catch((err) => {
        console.error('Google Maps failed to load:', err);
      });
  }, [projects]);

  return (
    <section
      id={id ?? undefined}
      ref={ref}
      className="w-full h-screen max-tablet:[--mobile-header-height:0px] max-tablet:h-[calc(100vh-var(--mobile-header-height))] max-tablet:min-h-[400px] max-tablet:mt-[var(--mobile-header-height)]"
    />
  );
}

export default Projects;
