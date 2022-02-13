/**
 * This is the unformatted version of the bookmarklet
 */
function hipbt() {
    var t = document.body,
        e = document.createElement("script");
    try {
        e.setAttribute(
            "src",
            "https://www.haveiplayedbowie.today/bookmarklet/sounds.js"
        ),
            e.setAttribute("type", "module"),
            e.setAttribute("async", !0),
            e.setAttribute("defer", !0),
            t.appendChild(e);
    } catch (t) {
        alert("There was an error");
    }
}
hipbt();
void 0;
