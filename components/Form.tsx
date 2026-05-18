'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styled from 'styled-components';

import SanityBackgroundImage from '@/components/SanityBackgroundImage';
import type { PageBySlugQueryResult } from '@/sanity.types';

type Page = NonNullable<PageBySlugQueryResult>;

const StyledForm = styled.div`
  background-color: var(--blue);
  border-left: var(--border-left);
  padding: 1rem;
  h2 {
    font-size: 2.35rem;
    padding: 0 2rem;
    @media only screen and (max-width: 800px) {
      padding: 0.375rem;
    }
  }
  label {
    display: none;
  }
  div {
    padding: 0.25rem 0rem;
  }
`;

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
      <StyledForm>
        <h2>{name || sectionHeading}</h2>
        <form
          name={formName}
          action="/thankyou/"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={handleSubmit}
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
          <div>
            <label htmlFor="message">Message:</label>
            <textarea
              id="message"
              name="message"
              placeholder={message}
              rows={5}
              cols={33}
            ></textarea>
          </div>
          <div>
            <button type="submit">Send</button>
          </div>
        </form>
      </StyledForm>
    </div>
  );
}

const Form = ({ page }: { page: Page }) => {
  const { id, name, background, backgroundColor, Heading, boxLocation } = page;
  const bgColor = backgroundColor?.hex ?? '#fff';
  const boxAlign = boxLocation || 'left';
  return (
    <>
      {background ? (
        <div className={boxAlign}>
          <section id={id ?? undefined} style={{ backgroundColor: bgColor }}>
            <SanityBackgroundImage image={background} width={2000}>
              <div>
                <FormBody name={name} sectionHeading={Heading} />
              </div>
            </SanityBackgroundImage>
          </section>
        </div>
      ) : (
        <div className={boxAlign}>
          <section id={id ?? undefined}>
            <div>
              <FormBody name={name} sectionHeading={Heading} />
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default Form;
