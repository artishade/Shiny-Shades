//seo.tsx


import type { FC, ReactNode } from "react";
import Head from "next/head";
import { BRAND } from "@/config/brandingConfig";

type OpenGraphType =
    | "website"
    | "article"
    | "book"
    | "profile"
    | "music.song"
    | "music.album"
    | "music.playlist"
    | "music.radio_station"
    | "video.movie"
    | "video.episode"
    | "video.tv_show"
    | "video.other";

type TwitterCardType =
    | "summary"
    | "summary_large_image"
    | "app"
    | "player";

type RobotsDirective =
    | "index"
    | "noindex"
    | "follow"
    | "nofollow"
    | "noarchive"
    | "nosnippet"
    | "noimageindex"
    | "max-snippet:-1"
    | "max-image-preview:large"
    | "max-image-preview:none"
    | "max-image-preview:standard";

export interface SEOProps {
    title: string;
    description: string;
    /** Canonical URL (absolute). Example: `https://example.com/page` */
    canonical?: string;
    keywords?: string | string[];
    siteName?: string;
    locale?: string;
    ogType?: OpenGraphType;
    image?: string;
    imageAlt?: string;
    imageWidth?: number;
    imageHeight?: number;
    twitterCard?: TwitterCardType;
    twitterSite?: string;
    twitterCreator?: string;
    robots?: RobotsDirective[];
    url?: string;
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
    children?: ReactNode;
}

const DEFAULTS = {
    siteName: BRAND.fullName,
    locale: "en_BD",
    ogType: "website" as OpenGraphType,
    twitterCard: "summary_large_image" as TwitterCardType,
    robots: ["index", "follow", "max-snippet:-1", "max-image-preview:large"] as RobotsDirective[],
};

// `key` values must match the ones CustomerLayout's <DefaultSEO> uses: next/head
// only de-dupes across <Head> instances via key (it ignores `property`, so og:*
// tags would otherwise appear twice and crawlers would read the site-wide one).
const SEO: FC<SEOProps> = ({
    title,
    description,
    canonical,
    keywords,
    siteName = DEFAULTS.siteName,
    locale = DEFAULTS.locale,
    ogType = DEFAULTS.ogType,
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    twitterCard = DEFAULTS.twitterCard,
    twitterSite,
    twitterCreator,
    robots = DEFAULTS.robots,
    url,
    jsonLd,
    children,
}) => {
    const resolvedUrl = url ?? canonical;
    const robotsContent = robots.join(", ");
    const keywordsContent = Array.isArray(keywords)
        ? keywords.join(", ")
        : keywords;

    const jsonLdItems = jsonLd
        ? Array.isArray(jsonLd)
            ? jsonLd
            : [jsonLd]
        : [];

    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} key="description" />
            {keywordsContent && <meta name="keywords" content={keywordsContent} key="keywords" />}
            <meta name="robots" content={robotsContent} key="robots" />

            {canonical && <link rel="canonical" href={canonical} key="canonical" />}

            <meta property="og:type" content={ogType} key="og:type" />
            <meta property="og:title" content={title} key="og:title" />
            <meta property="og:description" content={description} key="og:description" />
            <meta property="og:site_name" content={siteName} key="og:site_name" />
            <meta property="og:locale" content={locale} key="og:locale" />
            {resolvedUrl && <meta property="og:url" content={resolvedUrl} key="og:url" />}
            {image && <meta property="og:image" content={image} key="og:image" />}
            {image && imageAlt && <meta property="og:image:alt" content={imageAlt} key="og:image:alt" />}
            {imageWidth && <meta property="og:image:width" content={String(imageWidth)} key="og:image:width" />}
            {imageHeight && <meta property="og:image:height" content={String(imageHeight)} key="og:image:height" />}

            <meta name="twitter:card" content={twitterCard} key="twitter:card" />
            <meta name="twitter:title" content={title} key="twitter:title" />
            <meta name="twitter:description" content={description} key="twitter:description" />
            {twitterSite && <meta name="twitter:site" content={twitterSite} key="twitter:site" />}
            {twitterCreator && <meta name="twitter:creator" content={twitterCreator} key="twitter:creator" />}
            {image && <meta name="twitter:image" content={image} key="twitter:image" />}
            {image && imageAlt && <meta name="twitter:image:alt" content={imageAlt} key="twitter:image:alt" />}

            {jsonLdItems.map((item, index) => (
                <script key={`jsonld-${index}`} type="application/ld+json">
                    {JSON.stringify(item)}
                </script>
            ))}

            {children}
        </Head>
    );
};

export default SEO;
