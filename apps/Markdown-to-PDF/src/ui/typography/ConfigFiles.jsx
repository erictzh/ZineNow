// "Saved Config Files": opening and saving the Typography settings as a .json file.

import { pickFile, saveTextFile } from "../../io/filePickers.js";
import { appConfigFolderHint, configFileName, readConfigFile } from "../../settings/configFile.js";
import { SectionLabel, StatusLine } from "../fields.jsx";

const { useRef, useMemo } = React;

// Open and Save share this id, so pointing either at a "config" folder
// next to the app once makes both default there from then on (the
// browser remembers the folder per id; see io/filePickers.js).
const CONFIG_PICKER_ID = "md2ebook-config";
const CONFIG_PICKER_TYPES = { description: "JSON config file", accept: { "application/json": [".json"] } };

// `configFilename`/`configStatus` live in the Sidebar so they survive switching tabs.
export function ConfigFiles({ config, applyConfig, configFilename, setConfigFilename, configStatus, setConfigStatus }) {
  const configFileInputRef = useRef(null);
  const appFolderHint = useMemo(appConfigFolderHint, []);

  async function loadConfigFromFile(file) {
    try {
      applyConfig(await readConfigFile(file));
      setConfigStatus({ type: "success", message: `Loaded "${file.name}".` });
    } catch (err) {
      setConfigStatus({ type: "error", message: err.message });
    }
  }

  function handleConfigFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // reset so re-selecting the same file still fires onChange
    if (!file) return;
    loadConfigFromFile(file);
  }

  async function handleOpenConfigClick() {
    setConfigStatus(null);
    const file = await pickFile({ id: CONFIG_PICKER_ID, ...CONFIG_PICKER_TYPES });
    if (file === "fallback") { if (configFileInputRef.current) configFileInputRef.current.click(); return; }
    if (file) loadConfigFromFile(file);
  }

  async function handleSaveConfig() {
    setConfigStatus(null);
    try {
      const result = await saveTextFile(JSON.stringify(config, null, 2), {
        id: CONFIG_PICKER_ID, filename: configFileName(configFilename), mimeType: "application/json",
        description: CONFIG_PICKER_TYPES.description, extensions: [".json"],
      });
      if (!result) return;
      setConfigStatus({
        type: "success",
        message: result.saved ? `Saved "${result.saved}".` : `Downloaded "${result.downloaded}" (this browser doesn't support a Save As dialog).`,
      });
    } catch (err) {
      setConfigStatus({ type: "error", message: "Could not save the config file." });
    }
  }

  return (
    <React.Fragment>
      <SectionLabel>Saved Config Files</SectionLabel>
      <div className="flex items-center gap-2 mb-1.5">
        <button type="button" onClick={handleOpenConfigClick} className="log-btn">
          Open…
        </button>
        <button type="button" onClick={handleSaveConfig} className="log-btn">
          Save…
        </button>
        <input
          type="text"
          value={configFilename}
          onChange={(e) => setConfigFilename(e.target.value)}
          placeholder="config.json"
          className="min-w-0 flex-1 text-[11px] placeholder-fg-muted"
        />
        <input
          ref={configFileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleConfigFileSelected}
          className="hidden"
        />
      </div>
      {configStatus ? (
        <StatusLine status={configStatus} className="mb-3" />
      ) : (
        <p className="mb-3 text-[11px] leading-relaxed text-fg-muted opacity-70">
          Open a previously saved settings file, or save the settings below as a new one.
          {appFolderHint ? (
            <React.Fragment>
              {" "}
              A browser can't be pointed at a folder automatically — navigate Open/Save to{" "}
              <code className="text-[10px] not-italic">{appFolderHint}</code>
              {" once (creating it if it doesn't exist yet), and both will default there from then on."}
            </React.Fragment>
          ) : null}
        </p>
      )}
    </React.Fragment>
  );
}
