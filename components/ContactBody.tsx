'use client';

import { useState, useEffect } from 'react';
import classNames from 'classnames';

import { loader } from '@/lib/mapsLoader';
import sortObject from '@/utils/sortObject';
import splitByNewLines from '@/utils/splitByNewLines';
import type {
    AddressesQueryResult,
    PageBySlugQueryResult,
} from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const emailLink = '/bluepath-email-link.png';

export const ContactBody = ({
    id,
    Heading,
    name,
    richcontent,
    addresses,
}: {
    id: Page['id'];
    Heading: Page['Heading'];
    name: Page['name'];
    richcontent: Page['richcontent'];
    addresses: AddressesQueryResult;
}) => {
    const orderedAddresses = sortObject(addresses);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        loader.load().then(() => {
            const googleMaps = window.google.maps;
            const map: Record<number, google.maps.Map> = [];

            orderedAddresses.forEach(({ _id, location: center }) => {
                if (googleMaps && document.getElementById(String(_id)) !== null) {
                    map[Number(_id)] = new window.google.maps.Map(
                        document.getElementById(String(_id)) as HTMLElement,
                        {
                            center: center as unknown as google.maps.LatLngLiteral,
                            zoom: 12,
                        },
                    );
                }
            });
        });
    }, [orderedAddresses]);

    return (
        <div className="relative !grid grid-cols-[90vw] grid-rows-[150px_repeat(2,700px)] gap-[30px] justify-center !items-start w-auto max-w-full mx-auto [&_a]:text-white [&_a]:font-bold [&_a]:underline min-[1200px]:grid-cols-[auto_repeat(2,430px)] min-[1200px]:grid-rows-[auto] min-[1200px]:max-w-[80vw] min-[1200px]:!items-center min-[1129px]:max-[1200px]:pt-[20%] min-[800px]:max-[1128px]:pt-[30%] max-[600px]:pt-0">
            <div className="text-white" style={{ minWidth: '255px' }}>
                <h1 className="text-white">{Heading || name}</h1>
                {richcontent?.map((content) =>
                    content?.children?.map((c) => <p key={id}>{c?.text}</p>),
                )}

                <button
                    className='cursor-pointer p-0 bg-none -translate-x-3'
                    onClick={(e) => {
                        e.preventDefault();
                        window.open('mailto:info@bluepathfinance.com');
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={emailLink} alt="Bluepath contact email" />
                </button>
            </div>
            {orderedAddresses.map(({ _id, details, address }) => (
                <div
                    key={_id}
                    onClick={() => setShowInfo(Boolean(_id))}
                    onMouseEnter={() => setShowInfo(Boolean(_id))}
                    onMouseLeave={() => setShowInfo(false)}
                    className="max-w-[430px] m-0 max-[600px]:max-w-[calc(100vw-20px)] max-[600px]:max-h-[calc(calc(calc(100%-20px)*330px)/430px)]"
                >
                    <h3 className="bg-blue text-white text-lg py-4 px-6 mb-0 tracking-[1.3px] uppercase">
                        {splitByNewLines(String(address))}
                    </h3>
                    <div
                        id={_id ?? undefined}
                        className="w-[430px] h-[330px] max-[600px]:max-w-full max-[600px]:max-h-[calc(calc(calc(100%-20px)*330px)/430px)]"
                    />
                    <div
                        className={classNames(
                            'opacity-0 transition-opacity duration-[240ms] ease-out bg-[var(--color-gray-1)] h-full',
                            { '!opacity-100': showInfo === Boolean(_id) },
                        )}
                    >
                        <p className="text-white font-thin text-[1.3rem] p-[1.24rem] m-0 leading-[1.3]">
                            {splitByNewLines(String(details))}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
