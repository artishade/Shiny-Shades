//seo.tsx


import type { FC, ReactNode } from "react";
import { Helmet } from "react-helmet-async";

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
    themeColor?: string;
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
    children?: ReactNode;
}

const DEFAULTS = {
    siteName: "My Site",
    locale: "en_BD",
    ogType: "website" as OpenGraphType,
    twitterCard: "summary_large_image" as TwitterCardType,
    robots: ["index", "follow"] as RobotsDirective[],
    themeColor: "#ffffff",
};

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
    themeColor = DEFAULTS.themeColor,
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
        <Helmet prioritizeSeoTags>
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description} />
            {keywordsContent && <meta name="keywords" content={keywordsContent} />}
            <meta name="robots" content={robotsContent} />
            <meta name="googlebot" content={robotsContent} />
            <meta name="theme-color" content={themeColor} />

            {canonical && <link rel="canonical" href={canonical} />}

            <meta property="og:type" content={ogType} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:locale" content={locale} />
            {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
            {image && <meta property="og:image" content={image} />}
            {image && imageAlt && <meta property="og:image:alt" content={imageAlt} />}
            {imageWidth && <meta property="og:image:width" content={String(imageWidth)} />}
            {imageHeight && <meta property="og:image:height" content={String(imageHeight)} />}

            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {twitterSite && <meta name="twitter:site" content={twitterSite} />}
            {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
            {image && <meta name="twitter:image" content={image} />}
            {image && imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}

            {jsonLdItems.map((item, index) => (
                <script key={index} type="application/ld+json">
                    {JSON.stringify(item)}
                </script>
            ))}

            {children}
        </Helmet>
    );
};

export default SEO;