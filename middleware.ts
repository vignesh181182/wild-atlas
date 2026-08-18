/**
 * Carries the Clerk session on every request; it does not decide who may see
 * what. Since v7 Clerk advises against gating by path here, because the
 * matcher can drift from the way Next actually routes a request and leave
 * something reachable that was meant to be behind the gate. The check that
 * matters therefore lives on the resource — see app/page.tsx.
 *
 * The API routes stay open on purpose. They proxy iNaturalist, Wikipedia and
 * Wikidata, all of it open data and identical for everybody, which is what
 * lets them be cached publicly by the CDN (see the Cache-Control headers in
 * app/api/*). Nothing private goes through them: the groups and what is kept
 * in them never leave the browser.
 */

import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Everything except Next's own internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // And always the API routes.
    '/(api|trpc)(.*)',
  ],
};
