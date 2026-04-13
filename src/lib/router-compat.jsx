"use client";

import React from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
} from "next/navigation";

export const Link = React.forwardRef(function Link(
  { to, href, replace, scroll, prefetch, ...props },
  ref
) {
  return (
    <NextLink
      ref={ref}
      href={href ?? to ?? "/"}
      replace={replace}
      scroll={scroll}
      prefetch={prefetch}
      {...props}
    />
  );
});

export function useNavigate() {
  const router = useRouter();

  return React.useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        if (to === -1) {
          router.back();
        }
        return;
      }

      if (options.replace) {
        router.replace(to);
        return;
      }

      router.push(to);
    },
    [router]
  );
}

export function useLocation() {
  const pathname = usePathname();
  const [locationState, setLocationState] = React.useState({
    search: "",
    hash: "",
  });

  React.useEffect(() => {
    const updateLocationState = () =>
      setLocationState({
        search: window.location.search,
        hash: window.location.hash,
      });

    updateLocationState();
    window.addEventListener("hashchange", updateLocationState);
    window.addEventListener("popstate", updateLocationState);

    return () => {
      window.removeEventListener("hashchange", updateLocationState);
      window.removeEventListener("popstate", updateLocationState);
    };
  }, [pathname]);

  return {
    pathname,
    ...locationState,
  };
}

export function useParams() {
  return useNextParams();
}
