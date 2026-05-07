import React, { SyntheticEvent, useState } from "react";
import { encode } from "../utils/encode";
import { navigate } from "gatsby";
interface FormEventState {
  [`form-name`]: string;
  [`event-name`]: string;
  name: string;
  company: string;
  title: string;
  email: string;
  details: string;
}
const FormBasic = ({ name }: { name: string | null | undefined }) => {
  const intialFormState = {
    [`form-name`]: "events",
    [`event-name`]: name ?? "",
    name: "",
    company: "",
    title: "",
    email: "",
    details: "",
  };
  const [state, setState] = useState<FormEventState>(intialFormState);
  const handleChange = (e: SyntheticEvent) => {
    const target = e.target as HTMLInputElement;
    setState({ ...state, [target.name]: target.value });
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.target as HTMLFormElement;
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        ...state,
      }),
    }).then(() => navigate(form.getAttribute("action") as string));
    // .catch((error) => console.log(error));
  };
  return (
    <form
      name="events"
      action="/thankyou"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="event-name" value={state["event-name"]} />
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
