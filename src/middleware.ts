/**
 * Carries the Clerk session on every request; it does not decide who may see
 * what. Since v7 Clerk advises against gating by path here, because the
 * matcher can drift from the way Next actually routes a request and leave
 * something reachable that was meant to be behind the gate. The check that
 * matters therefore lives on the resource — see app/page.tsx.
 *
 * The creature and search routes stay open on purpose. They proxy
 * iNaturalist, Wikipedia and Wikidata, all of it open data and identical for
 * everybody, which is what lets them be cached publicly by the CDN (see the
 * Cache-Control headers in app/api/*).
 *
 * /api/library is the other kind: one reader's own groups and what is filed in
 * them. It is private and uncacheable, and it checks the session itself — see
 * server/api.ts, which every one of those routes goes through. The user id
 * comes from the Clerk session there and never from the request, so the check
 * cannot drift from the way a request is actually routed.
 */

import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Everything except Next's own internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // And always the API routes.
    '/(api|trpc)(.*)',
    // Clerk's own auto-proxy path. The broad matcher above already covers it,
    // but Clerk asks for it by name, and stating it keeps it covered if that
    // pattern is ever tightened.
    '/__clerk/:path*',
  ],
};
