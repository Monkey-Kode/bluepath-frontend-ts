import React from 'react';

import Government from '@/assets/government-flag.svg';
import Hospital from '@/assets/hospital.svg';
import Housing from '@/assets/housing.svg';
import Industrial from '@/assets/industrial.svg';
import Office from '@/assets/office.svg';
import School from '@/assets/school-flag.svg';
import University from '@/assets/university.svg';
import formatNumber from '@/utils/formatNumber';

import type { CasestudiesQueryResult } from '@/sanity.types';

type Casestudy = CasestudiesQueryResult[number];

const getImageComponent = (entity: readonly (string | null)[] | null) => {
  if (!entity) return <Office />;
  const sanitizeEntity = String(entity).toLowerCase().trim();
  if (sanitizeEntity.includes('residential')) {
    return <Housing />;
  } else if (
    sanitizeEntity.includes('school') ||
    sanitizeEntity.includes('education')
  ) {
    return <School />;
  } else if (
    sanitizeEntity.includes('industrial') ||
    sanitizeEntity.includes('agricultural')
  ) {
    return <Industrial />;
  } else if (sanitizeEntity.includes('university')) {
    return <University />;
  } else if (sanitizeEntity.includes('municipal')) {
    return <Government />;
  } else if (sanitizeEntity.includes('hospital')) {
    return <Hospital />;
  }
  return <Office />;
};

function FeaturedImage({
  image,
  title,
  entity,
}: {
  image: Casestudy['image'];
  title: Casestudy['title'];
  entity: Casestudy['entity'];
}) {
  if (image && image.asset && image.asset.url) {
    return (
      <div className="image">
        <img src={image.asset.url} alt={title ?? 'Featured Project'} />
      </div>
    );
  } else if (entity && entity.length > 0) {
    const ImageComponent = getImageComponent(entity);
    return <div className="image">{ImageComponent}</div>;
  }
  return null;
}

function InfoWindow({
  project: {
    title,
    address,
    content,
    image,
    id,
    location,
    entity,
    size,
    technologies,
  },
}: {
  project: Casestudy;
}) {
  return (
    <div id="content">
      <div id="siteNotice">
        <div id="bodyContent">
          {(entity || image) && (
            <FeaturedImage title={title} image={image} entity={entity} />
          )}
          <div className="content">
            <div className="line-content">
              <h3>Entity Type</h3>
              <p>{entity}</p>
            </div>
            <div className="line-content">
              <h3>Financing</h3>
              <p>{`$${size && formatNumber(size)}`}</p>
            </div>
            <div className="line-content">
              <h3>Technology</h3>
              <p>{technologies?.join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfoWindow;
