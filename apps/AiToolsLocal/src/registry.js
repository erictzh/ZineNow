// The tools list. A tool is { id, name, summary, create(ctx) } where create returns { mount(panelEl), unmount(), onKey?(e), primary?() }.
// ctx: { picture, status(text, kind), openModels() } (see main.js). Adding a tool = a new file in tools/ and one line in main.js.

const tools = [];
export const registerTool = (t) => { tools.push(t); return t; };
export const allTools = () => tools.slice();
