'use client';

import { useRouter } from 'next/navigation';

import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import type { PageBySlugQueryResult } from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

function FormBody({
  name,
  sectionHeading,
  boxLocation,
}: {
  name: Page['name'];
  sectionHeading: Page['Heading'];
  boxLocation?: Page['boxLocation'];
}) {
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('form-name', form.getAttribute('name') as string);
    await fetch('/__forms.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(
        formData as unknown as Record<string, string>,
      ).toString(),
    });
    router.push('/thankyou/');
  };

  let message = '';
  if (name === 'Assessment Request') {
    message =
      'Summary of proposed project, including technologies and preferred financing structure';
  }
  const boxAlign = boxLocation || 'left';
  const formName = name ?? 'generic';

  return (
    <div className={boxAlign}>
      <div className="bg-blue border-l-[var(--border-left)] p-4 [&_label]:hidden [&_>form>div]:px-0 [&_>form>div]:py-1">
        <h2 className="text-[2.35rem] px-8 max-tablet:p-[0.375rem]">
          {name || sectionHeading}
        </h2>
        <form
          name={formName}
          action="/thankyou/"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-4 gap-y-1 max-[480px]:grid-cols-1 [&_input]:w-full [&_input]:bg-white [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_textarea]:w-full [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2"
        >
          <input type="hidden" name="form-name" value={formName} />
          <p hidden>
            <label>
              Don’t fill this out: <input name="bot-field" />
            </label>
          </p>
          <div>
            <label htmlFor="name">Name:</label>
            <input id="name" type="text" name="name" placeholder="Name" />
          </div>
          <div>
            <label htmlFor="company">Company:</label>
            <input
              id="company"
              type="text"
              name="company"
              placeholder="Company"
            />
          </div>
          <div>
            <label htmlFor="position">Position:</label>
            <input
              id="position"
              type="text"
              name="position"
              placeholder="Position"
            />
          </div>
          <div>
            <label htmlFor="email">Email:</label>
            <input id="email" type="email" name="email" placeholder="Email" />
          </div>
          <div>
            <label htmlFor="phone">Enter your phone number:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
              placeholder="Phone"
            />
          </div>
          <div>
            <label htmlFor="state">State</label>
            <select id="state" name="state">
              <option value="">STATE</option>
              <option value="Alabama">Alabama</option>
              <option value="Alaska">Alaska</option>
              <option value="Arizona">Arizona</option>
              <option value="Arkansas">Arkansas</option>
              <option value="California">California</option>
              <option value="Colorado">Colorado</option>
              <option value="Connecticut">Connecticut</option>
              <option value="Delaware">Delaware</option>
              <option value="District of Columbia">District of Columbia</option>
              <option value="Florida">Florida</option>
              <option value="Georgia">Georgia</option>
              <option value="Guam">Guam</option>
              <option value="Hawaii">Hawaii</option>
              <option value="Idaho">Idaho</option>
              <option value="Illinois">Illinois</option>
              <option value="Indiana">Indiana</option>
              <option value="Iowa">Iowa</option>
              <option value="Kansas">Kansas</option>
              <option value="Kentucky">Kentucky</option>
              <option value="Louisiana">Louisiana</option>
              <option value="Maine">Maine</option>
              <option value="Maryland">Maryland</option>
              <option value="Massachusetts">Massachusetts</option>
              <option value="Michigan">Michigan</option>
              <option value="Minnesota">Minnesota</option>
              <option value="Mississippi">Mississippi</option>
              <option value="Missouri">Missouri</option>
              <option value="Montana">Montana</option>
              <option value="Nebraska">Nebraska</option>
              <option value="Nevada">Nevada</option>
              <option value="New Hampshire">New Hampshire</option>
              <option value="New Jersey">New Jersey</option>
              <option value="New Mexico">New Mexico</option>
              <option value="New York">New York</option>
              <option value="North Carolina">North Carolina</option>
              <option value="North Dakota">North Dakota</option>
              <option value="Northern Marianas Islands">
                Northern Marianas Islands
              </option>
              <option value="Ohio">Ohio</option>
              <option value="Oklahoma">Oklahoma</option>
              <option value="Oregon">Oregon</option>
              <option value="Pennsylvania">Pennsylvania</option>
              <option value="Puerto Rico">Puerto Rico</option>
              <option value="Rhode Island">Rhode Island</option>
              <option value="South Carolina">South Carolina</option>
              <option value="South Dakota">South Dakota</option>
              <option value="Tennessee">Tennessee</option>
              <option value="Texas">Texas</option>
              <option value="Utah">Utah</option>
              <option value="Vermont">Vermont</option>
              <option value="Virginia">Virginia</option>
              <option value="Virgin Islands">Virgin Islands</option>
              <option value="Washington">Washington</option>
              <option value="West Virginia">West Virginia</option>
              <option value="Wisconsin">Wisconsin</option>
              <option value="Wyoming">Wyoming</option>
            </select>
          </div>
          <div className="col-span-2 max-[480px]:col-span-1">
            <label htmlFor="message">Message:</label>
            <textarea
              id="message"
              name="message"
              placeholder={message}
              rows={5}
              cols={33}
            />
          </div>
          <div className="col-span-2 max-[480px]:col-span-1">
            <button type="submit">Send</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Form = ({ page }: { page: Page }) => {
  const { id, name, background, backgroundColor, Heading, boxLocation } = page;
  const bgColor = backgroundColor?.hex ?? '#fff';
  const boxAlign = boxLocation || 'left';

  return background ? (
    <div className={boxAlign}>
      <SanityBackgroundImage
        as="section"
        id={id ?? undefined}
        image={background}
        style={{ backgroundColor: bgColor }}
        width={2000}
      >
        <div>
          <FormBody name={name} sectionHeading={Heading} />
        </div>
      </SanityBackgroundImage>
    </div>
  ) : (
    <div className={boxAlign}>
      <section id={id ?? undefined}>
        <div>
          <FormBody name={name} sectionHeading={Heading} />
        </div>
      </section>
    </div>
  );
};

export default Form;
