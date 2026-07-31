"use client";

import * as React from "react";
import Script from "next/script";
import { useStoreSettings } from "@/components/common/settings-provider";

export function TrackingScripts() {
  const { settings } = useStoreSettings();

  const gaId = settings?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_ID || "G-8RQGBPV32Y";
  const gtmId = settings?.googleTagManagerId || process.env.NEXT_PUBLIC_GTM_ID;
  const fbPixelId = settings?.facebookPixelId || process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  return (
    <>
      {/* Google Analytics GA4 */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}

      {/* Google Tag Manager */}
      {settings.googleTagManagerId && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${settings.googleTagManagerId}');
          `}
        </Script>
      )}

      {/* Facebook Pixel */}
      {settings.facebookPixelId && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${settings.facebookPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* Meta verification */}
      {settings.metaVerification && (
        <meta name="facebook-domain-verification" content={settings.metaVerification} />
      )}

      {/* Google Search Console verification */}
      {settings.googleSearchConsoleVerification && (
        <meta name="google-site-verification" content={settings.googleSearchConsoleVerification} />
      )}
    </>
  );
}
