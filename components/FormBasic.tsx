'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FormEventState {
  name: string;
  company: string;
  title: string;
  email: string;
  details: string;
}

const inputClass =
  'bg-white border border-[var(--color-gray-3)] rounded-none mb-[0.6rem] px-3 py-[0.65rem] font-sans text-[var(--color-gray-3)] text-sm placeholder:text-[var(--color-gray-3)] placeholder:uppercase placeholder:tracking-[0.06em] placeholder:text-[1.25rem]';

const FormBasic = ({ name }: { name: string | null | undefined }) => {
  const router = useRouter();
  const [state, setState] = useState<FormEventState>({
    name: '',
    company: '',
    title: '',
    email: '',
    details: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

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

  return (
    <form
      name="events"
      action="/thankyou/"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="form-name" value="events" />
      <input type="hidden" name="event-name" value={name ?? ''} />
      <p hidden>
        <label>
          Don’t fill this out: <input name="bot-field" />
        </label>
      </p>
      <label htmlFor="name" className="hidden">
        Name:
      </label>
      <input
        id="name"
        type="text"
        name="name"
        placeholder="Name"
        value={state.name}
        onChange={handleChange}
        className={inputClass}
      />
      <label htmlFor="company" className="hidden">
        Company:
      </label>
      <input
        id="company"
        type="text"
        name="company"
        placeholder="Company"
        value={state.company}
        onChange={handleChange}
        className={inputClass}
      />
      <label htmlFor="title" className="hidden">
        Title:
      </label>
      <input
        id="title"
        type="text"
        name="title"
        placeholder="Title"
        value={state.title}
        onChange={handleChange}
        className={inputClass}
      />
      <label htmlFor="email" className="hidden">
        Email:
      </label>
      <input
        id="email"
        type="email"
        name="email"
        placeholder="Email"
        value={state.email}
        onChange={handleChange}
        className={inputClass}
      />

      <label htmlFor="details" className="hidden">
        Details:
      </label>
      <input
        id="details"
        type="text"
        name="details"
        placeholder="Preferred meeting time"
        value={state.details}
        onChange={handleChange}
        className={inputClass}
      />
      <div className="group flex items-center justify-center gap-[0.6rem] mt-4">
        <svg
          className="w-[23px] h-[27px] fill-white stroke-accent [stroke-width:1] [vector-effect:non-scaling-stroke] block origin-center transition-all group-hover:fill-accent group-hover:translate-x-1 group-hover:scale-[1.12]"
          viewBox="0 0 20 24"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <polygon points="2,2 18,12 2,22" />
        </svg>
        <button
          type="submit"
          className="bg-white text-[var(--color-gray-3)] border border-[var(--color-gray-3)] rounded-none uppercase tracking-[0.5px] text-[1.25rem] font-medium py-2 px-2 cursor-pointer transition-colors hover:bg-accent hover:text-white hover:border-accent"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default FormBasic;
