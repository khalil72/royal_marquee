import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <Suspense>{children}</Suspense>;
}
