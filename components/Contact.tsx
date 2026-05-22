import { ContactBody } from '@/components/ContactBody';
import type {
  AddressesQueryResult,
  PageBySlugQueryResult,
} from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

function Contact({
  page,
  addresses,
}: {
  page: Page;
  addresses: AddressesQueryResult;
}) {
  const { Heading, id, name, richcontent } = page;

  return (
    <ContactBody
      id={id}
      Heading={Heading}
      name={name}
      richcontent={richcontent}
      addresses={addresses}
    />
  );
}

export default Contact;
