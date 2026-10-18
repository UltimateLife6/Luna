import type { Metadata } from "next";

export const demoRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export function pageMetadata(title: string): Metadata {
  return {
    title,
    robots: demoRobots,
  };
}
