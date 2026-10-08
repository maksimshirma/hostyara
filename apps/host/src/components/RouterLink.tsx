import Link, { LinkProps } from "@mui/material/Link";
import { useRouterLinkClick } from "../router";

export type RouterLinkProps = Omit<LinkProps, "href"> & { href: string };

export function RouterLink({ href, onClick, ...rest }: RouterLinkProps) {
  const navigate = useRouterLinkClick(href);
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        navigate(event);
      }}
      {...rest}
    />
  );
}
