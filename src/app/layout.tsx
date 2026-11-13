import type { Metadata, Viewport } from "next";

import { site } from "@/lib/site";
import { siteDeploy } from "@/lib/site-url";
import { montserrat, playfair } from "@/styles/fonts";

import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteDeploy.siteUrl),
  title: {
    default: `${site.name} · Consultoria de Imagem e Estilo`,
    template: `%s · ${site.name}`,
  },
  robots: { index: siteDeploy.indexable, follow: siteDeploy.indexable },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${montserrat.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
