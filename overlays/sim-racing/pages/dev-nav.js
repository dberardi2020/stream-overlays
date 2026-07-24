/* Dev-only nav links, on every page — Layer (site chrome).

   Surfaces the local tools (Admin curation, Debug input inspector) in the shared
   site nav whenever the site is running locally, so they're reachable from any
   page, not just Home. On a real (public) domain the host check fails and nothing
   is added, so the links never ship. Idempotent: it skips any link the page
   already renders (e.g. the Debug page's own current-page link), so including it
   everywhere is safe.

   One source for all pages (mirrors the per-page localhost gate). When the site
   style kit lands (SO-0025) this is a natural thing to fold into a shared nav
   include alongside the markup. */
const DEV_LINKS = [
  { href: "/pages/admin.html", label: "Admin" },
  { href: "/pages/debug.html", label: "Debug" }
];
const LOCAL = ["localhost", "127.0.0.1", "[::1]", ""].includes(location.hostname) || location.protocol === "file:";

if (LOCAL) {
  const nav = document.querySelector(".sitenav-links");
  if (nav) {
    for (const { href, label } of DEV_LINKS) {
      if (nav.querySelector(`a[href="${href}"]`)) continue;   // page already links it
      const a = document.createElement("a");
      a.href = href; a.textContent = label; a.dataset.dev = "1";
      nav.appendChild(a);
    }
  }
}
