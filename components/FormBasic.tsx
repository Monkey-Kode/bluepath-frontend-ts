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
      <label htmlFor="name">Name:</label>
      <input
        id="name"
        type="text"
        name="name"
        placeholder="Name"
        value={state.name}
        onChange={handleChange}
      />
      <label htmlFor="company">Company:</label>
      <input
        id="company"
        type="text"
        name="company"
        placeholder="Company"
        value={state.company}
        onChange={handleChange}
      />
      <label htmlFor="title">Title:</label>
      <input
        id="title"
        type="text"
        name="title"
        placeholder="Title"
        value={state.title}
        onChange={handleChange}
      />
      <label htmlFor="email">Email:</label>
      <input
        id="email"
        type="email"
        name="email"
        placeholder="Email"
        value={state.email}
        onChange={handleChange}
      />

      <label htmlFor="details">Details:</label>
      <input
        id="details"
        type="text"
        name="details"
        placeholder="Preferred meeting time"
        value={state.details}
        onChange={handleChange}
      />
      <div className="submit-row">
        <svg
          className="submit-triangle"
          viewBox="0 0 20 24"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <polygon points="2,2 18,12 2,22" />
        </svg>
        <button type="submit">Submit</button>
      </div>
    </form>
  );
};

export default FormBasic;
