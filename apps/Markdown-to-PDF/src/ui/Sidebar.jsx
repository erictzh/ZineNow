// The right-hand sidebar: the Editor / Typography tabs.

import { EditorTab } from "./editor/EditorTab.jsx";
import { BodyTextSection } from "./typography/BodyTextSection.jsx";
import { ConfigFiles } from "./typography/ConfigFiles.jsx";
import { HeadingsSection } from "./typography/HeadingsSection.jsx";
import { PageNumbersSection } from "./typography/PageNumbersSection.jsx";
import { PageSection } from "./typography/PageSection.jsx";
import { TocSection } from "./typography/TocSection.jsx";
import { TypefaceSection } from "./typography/TypefaceSection.jsx";

const { useState } = React;

export function Sidebar({ activeTab, setActiveTab, markdown, setMarkdown, editorRef, fileSave, docStatus, setDocStatus, config, updateConfig, applyConfig, fontOptions, setFontOptions, resizer }) {
  // Kept here rather than in the tabs, so status messages, the typed
  // settings-file name and the blank-space height survive switching tabs
  // (the editor's own status message lives in App, next to the File menu).
  const [spaceLines, setSpaceLines] = useState("5");
  const [configFilename, setConfigFilename] = useState("config.json");
  const [configStatus, setConfigStatus] = useState(null); // { type: 'success'|'error', message }
  const sectionProps = { config, updateConfig };

  return (
    <aside className="md2ebook-sidebar">
      {resizer}
      <div className="tabbar">
        <button type="button" onClick={() => setActiveTab("editor")} className={"tab" + (activeTab === "editor" ? " active" : "")}>
          Editor
        </button>
        <button type="button" onClick={() => setActiveTab("typography")} className={"tab" + (activeTab === "typography" ? " active" : "")}>
          Typography
        </button>
      </div>
      <div className="md2ebook-sidebar-content">
        {activeTab === "editor" ? (
          <EditorTab
            markdown={markdown}
            setMarkdown={setMarkdown}
            editorRef={editorRef}
            fileSave={fileSave}
            docStatus={docStatus}
            setDocStatus={setDocStatus}
            spaceLines={spaceLines}
            setSpaceLines={setSpaceLines}
          />
        ) : (
          <div className="p-4">
            <ConfigFiles
              config={config}
              applyConfig={applyConfig}
              configFilename={configFilename}
              setConfigFilename={setConfigFilename}
              configStatus={configStatus}
              setConfigStatus={setConfigStatus}
            />
            <TypefaceSection {...sectionProps} fontOptions={fontOptions} setFontOptions={setFontOptions} />
            <PageSection {...sectionProps} />
            <BodyTextSection {...sectionProps} />
            <HeadingsSection {...sectionProps} />
            <TocSection {...sectionProps} />
            <PageNumbersSection {...sectionProps} />
          </div>
        )}
      </div>
    </aside>
  );
}
