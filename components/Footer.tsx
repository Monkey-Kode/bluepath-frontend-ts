'use client';

import DarkLogo from '@/assets/dark-logo336.svg';
import Menu from '@/components/Menu';
import splitByNewLines from '@/utils/splitByNewLines';
import sortObject from '@/utils/sortObject';
import type {
  AddressesQueryResult,
  NavigationQueryResult,
} from '@/sanity.types';

function Footer({
  addresses,
  navigation,
}: {
  addresses: AddressesQueryResult;
  navigation: NavigationQueryResult;
}) {
  const addressesOrdered = sortObject(addresses);

  return (
    <footer className="w-screen items-center overflow-hidden bg-surface px-[2vw] py-[4vw] max-tablet:px-[5vw] max-tablet:py-[7vw] tablet:grid tablet:grid-cols-[2fr_1fr] tablet:grid-rows-[auto]">
      <div className="footer-logo tablet:row-[1/2] tablet:col-[1/2] tablet:mr-[20%] tablet:text-right max-tablet:hidden">
        <DarkLogo style={{ maxWidth: '300px', margin: '0 auto' }} />
      </div>
      <div className="mx-auto flex w-full flex-col gap-5 tablet:row-[1/2] tablet:col-[2/3]">
        {addressesOrdered.map(({ _id, address, details }) => (
          <div key={_id} className="address border-l-4 border-accent pl-2.5">
            <h3 className="m-0 mb-1 font-sans font-bold leading-tight text-blue">
              {address}
            </h3>
            <address className="not-italic leading-[1.3] text-blue">
              {splitByNewLines(String(details))}
            </address>
          </div>
        ))}
      </div>
      <div className="tablet:row-[2/3] tablet:col-[1/3]">
        <Menu
          open={false}
          siteLocation="footer"
          navigation={navigation}
          className="[&_ul]:items-center [&_ul]:justify-center [&_ul_li]:px-4 [&_ul_li_a]:text-[0.8rem]"
        />
      </div>
    </footer>
  );
}

export default Footer;
