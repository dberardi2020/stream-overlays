/* Dev-only nav links + accent, one shared source — site chrome.

   Surfaces the local tools (Admin curation, Debug input inspector) in the shared
   site nav when running locally, so they're reachable from any page. Three things
   it deliberately does:

   - Runs SYNCHRONOUSLY (a classic script, included right after the <nav>), so it
     mutates the nav before first paint — no post-load flicker. (As a deferred
     module it appended after paint, which flickered on every navigation.)
   - Appends BOTH links in a FIXED order on every page and sets aria-current
     itself, so the nav order never depends on which page rendered it — no reorder
     when you land on Debug/Admin.
   - Injects the `data-dev` accent rule once, from here, so the colour lives in a
     single place instead of being copied into every page's <style>.

   On a real (public) domain the host check fails and nothing is added, so the
   links never ship. (Fuller nav/style consolidation is SO-0025.) */
(function () {
  var LOCAL = ["localhost", "127.0.0.1", "[::1]", ""].indexOf(location.hostname) >= 0 || location.protocol === "file:";
  if (!LOCAL) return;

  if (!document.getElementById("dev-nav-style")) {
    var st = document.createElement("style");
    st.id = "dev-nav-style";
    st.textContent = ".sitenav-links a[data-dev]{color:var(--clu)}";
    document.head.appendChild(st);
  }

  var nav = document.querySelector(".sitenav-links");
  if (!nav) return;

  var here = location.pathname.replace(/\/index\.html$/, "/");
  [["/pages/admin.html", "Admin"], ["/pages/debug.html", "Debug"]].forEach(function (d) {
    if (nav.querySelector('a[href="' + d[0] + '"]')) return;   // page already links it
    var a = document.createElement("a");
    a.href = d[0]; a.textContent = d[1]; a.dataset.dev = "1";
    if (here === d[0]) a.setAttribute("aria-current", "page");
    nav.appendChild(a);
  });
})();
