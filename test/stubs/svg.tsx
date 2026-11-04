import type { SVGProps } from 'react';

export default function SvgStub(
  props: SVGProps<SVGSVGElement> & { title?: string },
) {
  const { title, ...rest } = props;
  return (
    <svg data-testid="svg-stub" {...rest}>
      {title ? <title>{title}</title> : null}
    </svg>
  );
}
