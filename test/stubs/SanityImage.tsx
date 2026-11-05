/** Renders the asset ID, so tests need no Sanity project settings. */
export default function SanityImageStub({
  image,
  alt,
}: {
  image: { asset?: { _id?: string | null } | null } | null;
  alt?: string | null;
}) {
  const id = image?.asset?._id;
  return id ? <img alt={alt ?? ''} data-image-id={id} /> : null;
}
