// Reading what a drop holds (shared/js/dropImages.js readDrop): files from the file manager, or a
// picture's address from another page (dragged HTML, a link, plain text).
import { readDrop } from "../shared/js/dropImages.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const eq = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), msg + (JSON.stringify(got) === JSON.stringify(want) ? "" : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`));

// A fake DataTransfer: files and a map of text types.
const drop = (data = {}, files = []) => ({ files, getData: (t) => data[t] || "" });
const file = (name, type = "") => ({ name, type });

// Files from the file manager
let r = readDrop(drop({}, [file("cat.jpg", "image/jpeg")]));
eq([r.files.length, r.url], [1, null], "a picture file is taken");
r = readDrop(drop({}, [file("logo.svg"), file("notes.txt", "text/plain")]));
eq(r.files.map((f) => f.name), ["logo.svg"], "an SVG with no type counts; a text file doesn't");
eq(readDrop(drop({}, [file("doc.pdf", "application/pdf")])), null, "a PDF alone is not a picture");

// From another website
r = readDrop(drop({ "text/html": '<img src="https://upload.example.org/a/b.png?x=1&amp;y=2" alt="A &quot;cat&quot;" width=10>' }));
eq([r.url, r.alt], ["https://upload.example.org/a/b.png?x=1&y=2", 'A "cat"'], "the <img> in the dragged HTML: address (entities decoded) and alt");
r = readDrop(drop({ "text/html": "<a href='/page'><img alt='' src='//cdn.example.org/p.webp'></a>" }));
eq(r.url, "https://cdn.example.org/p.webp", "a protocol-relative address gets https");
eq(readDrop(drop({ "text/html": '<img src="/relative/p.png">' })), null, "a relative address can't be fetched");
r = readDrop(drop({ "text/html": '<img src="data:image/png;base64,AAAA">' }));
eq(r.url, "data:image/png;base64,AAAA", "a data: picture is taken");
r = readDrop(drop({ "text/uri-list": "# a comment\nhttps://example.org/photo.JPG" }));
eq(r.url, "https://example.org/photo.JPG", "a link to a picture file (uri-list)");
eq(readDrop(drop({ "text/uri-list": "https://example.org/some/page" })), null, "an ordinary page link is not a picture");
r = readDrop(drop({ "text/plain": "https://example.org/a.gif" }));
eq(r.url, "https://example.org/a.gif", "plain text that is a picture address");
eq(readDrop(drop({ "text/plain": "just some words" })), null, "plain words are not a picture");
eq(readDrop(drop({ "text/plain": "https://example.org/a.png and more" })), null, "...nor text that merely contains an address");
r = readDrop(drop({ "text/html": '<img src="https://a.test/x.png">' }, [file("pic.png", "image/png")]));
eq([r.files.length, r.url], [1, null], "files win over an address");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
