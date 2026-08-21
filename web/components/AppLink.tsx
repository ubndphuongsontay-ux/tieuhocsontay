"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

/** Internal links must not prefetch: each menu/card target is a full DB render. */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
