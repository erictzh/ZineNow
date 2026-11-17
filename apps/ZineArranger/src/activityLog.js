// The activity log panel: REPL-style command/result lines, clear, show/hide, copy.
//
// For transparency about what the app is doing in the background: every action
// prints the actual function call being run (the "command"), then an indented
// line with what happened (the "result") — like a terminal echoing input/output.
//
// For transparency about what the app is doing in the background: every action
// prints the actual function call being run (the "command"), then an indented
// line with what happened (the "result") — like a terminal echoing input/output.

import { state } from "./state.js";

function logTimestamp() {
    return new Date().toLocaleTimeString([], { hour12: false });
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// system message — no command context (startup, log cleared, etc.)
export function logSys(msg) {
    var out = document.getElementById("log-output");
    if(!out) return;
    var line = document.createElement("div");
    line.className = "log-line log-sys";
    line.textContent = "[" + logTimestamp() + "] # " + msg;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

// the "command" line — echoes the real function call currently executing, terminal-prompt style
export function logCmd(codeLine) {
    var out = document.getElementById("log-output");
    if(!out) return;
    var line = document.createElement("div");
    line.className = "log-line log-cmd";
    line.innerHTML = '<span class="log-time">[' + logTimestamp() + ']</span> '
        + '<span class="log-prompt">&#10095;</span> '
        + '<span class="log-code">' + escapeHtml(codeLine) + '</span>';
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

// the "result" line — indented under its command, like a REPL printing the return value
export function logResult(msg, isWarn) {
    var out = document.getElementById("log-output");
    if(!out) return;
    var line = document.createElement("div");
    line.className = "log-line log-result" + (isWarn ? " log-warn" : "");
    line.innerHTML = '<span class="log-arrow">&#8618;</span> ' + escapeHtml(msg);
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

// legacy helper (kept so any single-line call site still works) — behaves like logResult
function zineLog(msg, isWarn) {
    logResult(msg, isWarn);
}

export function clearLog() {
    document.getElementById("log-output").innerHTML = "";
    logSys("Log cleared.");
}

export function toggleLogPanel() {
    state.logPanelVisible = !state.logPanelVisible;
    document.getElementById("log-output-wrap").style.display = state.logPanelVisible ? "block" : "none";
    document.getElementById("log-toggle-btn").textContent = state.logPanelVisible ? "Hide" : "Show";
}

export function copyLog() {
    var out = document.getElementById("log-output");
    var btn = document.getElementById("log-copy-btn");
    if(!out || !btn) return;
    var lines = out.querySelectorAll(".log-line");
    var text = Array.prototype.map.call(lines, function(el) { return el.textContent; }).join("\n");

    function flash(label) {
        var original = "⧉ Copy";
        btn.textContent = label;
        setTimeout(function() { btn.textContent = original; }, 1200);
    }

    if(navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            flash("✓ Copied");
        }).catch(function() {
            flash("Error");
        });
    } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
            flash("✓ Copied");
        } catch(e) {
            flash("Error");
        }
        document.body.removeChild(ta);
    }
}
