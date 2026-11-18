// Threaded text frames (model/text/threads.js) and the composer's continuation option.
import { composeText } from "../apps/ZEditor/src/render/composer.js";
import { followerView, isThreaded, removeWithThreads, routeFramePatch, standaloneCopy, storyChains, withoutResolvedProps } from "../apps/ZEditor/src/model/text/threads.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const measure = (s) => Array.from(s).length * 10;

const head = { id: 1, type: "text", text: "one two three\nfour five", fontSize: 20, color: "#f00", x: 0, y: 0, width: 100, frameHeight: 40, colorRuns: [{ start: 4, end: 7, color: "#00f" }, { start: 14, end: 18, color: "#0f0" }] };
const f2 = { id: 2, type: "text", text: "", x: 200, y: 0, width: 80, frameHeight: 30, threadFrom: 1 };
const f3 = { id: 3, type: "text", text: "", x: 400, y: 0, width: 80, frameHeight: 30, threadFrom: 2 };
const img = { id: 9, type: "image", x: 0, y: 0, width: 10, height: 10 };
const anns = [head, img, f2, f3];

// Chains
const chains = storyChains(anns);
ok(chains.length === 1 && chains[0].map((a) => a.id).join() === "1,2,3", "one chain, frames in reading order");
ok(storyChains([head, img]).length === 0, "a box with no follower is not a chain");
ok(storyChains([head, f2, { ...f3, id: 4, threadFrom: 1 }]).length === 1 && storyChains([head, f2, { ...f3, id: 4, threadFrom: 1 }])[0].length === 2, "a second follower of the same frame is ignored");
ok(storyChains([{ ...head, threadFrom: 2 }, f2]).length === 0, "a loop has no head and makes no chain");
ok(storyChains([head, { ...f2, threadFrom: 9 }]).length === 0, "a follower of a non-text item is ignored");
ok(isThreaded(anns, 1) && isThreaded(anns, 3) && !isThreaded(anns, 9), "isThreaded");

// The follower's view
const v = followerView(head, f2, 8);
ok(v.id === 2 && v.x === 200 && v.width === 80 && v.frameHeight === 30, "follower keeps its own frame");
ok(v.fontSize === 20 && v.color === "#f00", "follower takes the story's look");
ok(v.text === "three\nfour five" && v.storyOffset === 8, "follower shows the rest of the story");
ok(v.threadFrom === undefined, "follower view has no threadFrom (so resolving twice changes nothing)");
ok(v.storyContinues === true, "starts mid-paragraph -> continues");
ok(followerView(head, f2, 14).storyContinues === false, "starts right after a new line -> a new paragraph");
ok(JSON.stringify(v.colorRuns) === JSON.stringify([{ start: 6, end: 10, color: "#0f0" }]), "colour runs move with the text");

// Patches made through a follower
const r = routeFramePatch(head, 8, { text: "three!\nfour five", width: 90, fontSize: 30 });
ok(r.headPatch.text === "one two three!\nfour five", "typing in a follower edits the story");
ok(r.framePatch.width === 90 && !("width" in r.headPatch), "frame settings stay on the follower");
ok(r.headPatch.fontSize === 30 && !("fontSize" in r.framePatch), "look settings go to the story");
const rc = routeFramePatch(head, 8, { colorRuns: [{ start: 0, end: 2, color: "#123" }] });
ok(JSON.stringify(rc.headPatch.colorRuns) === JSON.stringify([{ start: 4, end: 7, color: "#00f" }, { start: 8, end: 10, color: "#123" }]), "colouring in a follower: runs before it kept, new ones shifted");

// Deleting frames
const delMid = removeWithThreads(anns, [2]);
ok(delMid.length === 3 && delMid.find((a) => a.id === 3).threadFrom === 1, "deleting a middle frame links its neighbours");
const delHead = removeWithThreads(anns, [1]);
const newHead = delHead.find((a) => a.id === 2);
ok(newHead.threadFrom === undefined && newHead.text === head.text && newHead.fontSize === 20 && newHead.x === 200 && newHead.width === 80, "deleting the head: the next frame takes the story, keeps its own frame");
ok(delHead.find((a) => a.id === 3).threadFrom === 2, "...and the rest of the chain follows it");
const delTwo = removeWithThreads(anns, [1, 2]);
ok(delTwo.find((a) => a.id === 3).text === head.text && delTwo.find((a) => a.id === 3).threadFrom === undefined, "deleting head and second frame together: the third takes the story");
ok(removeWithThreads(anns, [9]).every((a) => a.threadFrom === undefined || a.threadFrom === (a.id === 2 ? 1 : 2)), "deleting an unrelated item leaves the chain alone");

// Copy
const copy = standaloneCopy({ ...v, storyLength: 5, storyHeadId: 1, wrapObstacles: [{}] });
ok(copy.text === "three" && copy.storyHeadId === undefined && copy.wrapObstacles === undefined && copy.threadFrom === undefined, "a copied frame is a plain box with the words it shows");
ok(withoutResolvedProps({ a: 1 }).a === 1, "withoutResolvedProps keeps ordinary props");

// Composer: a continued paragraph has no first-line indent
const text = "alpha beta gamma delta";
const plain = composeText(text, measure, { width: 120, indentFirst: 30, composer: "single" });
const cont = composeText(text, measure, { width: 120, indentFirst: 30, composer: "single", continued: true });
ok(plain[0].x === 30 && plain[0].first === true, "first-line indent on a new paragraph");
ok(cont[0].x === 0 && cont[0].first === false, "no first-line indent on a continued paragraph");
const two = composeText("aa bb\ncc dd", measure, { width: 120, indentFirst: 30, continued: true });
ok(two.find((l) => l.para === 1).x === 30 && two.find((l) => l.para === 1).first, "...but the next paragraph gets it");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");
