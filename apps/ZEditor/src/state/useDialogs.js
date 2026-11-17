// Which dialog is open: New Document, keyboard shortcuts, and the two-step "this erases your work" confirmation.

const { useState } = React;

export function useDialogs({ pages, openProjectPicker }) {
  const [newDocOpen, setNewDocOpen] = useState(false);
  // True when the New Document dialog was reached through New Project
  // (so it offers "Open a PDF instead"); false from the empty-state button.
  const [newDocFromProject, setNewDocFromProject] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Two-step "this erases your work" confirmation, shared by New
  // Project and Load Project — action is null (closed), "newProject",
  // or "loadProject"; step is 1 (first warning) or 2 (final check).
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmStep, setConfirmStep] = useState(1);

  function openNewDocDialog(fromProject) {
    setNewDocFromProject(fromProject);
    setNewDocOpen(true);
  }

  // "New Project" only ever appears once a project is already loaded
  // (Load PDF covers the empty-state case), so it always needs the
  // warning. "Load Project" appears at all times, but only needs it
  // once there's actually something on screen to lose.
  function handleNewProjectClick() {
    setConfirmAction("newProject");
    setConfirmStep(1);
  }

  function handleLoadProjectClick() {
    if (pages.length > 0) {
      setConfirmAction("loadProject");
      setConfirmStep(1);
    } else {
      openProjectPicker();
    }
  }

  function handleConfirmProceed() {
    setConfirmStep(2);
  }

  function handleConfirmCancel() {
    setConfirmAction(null);
    setConfirmStep(1);
  }

  function handleConfirmYes() {
    const action = confirmAction;
    setConfirmAction(null);
    setConfirmStep(1);
    if (action === "newProject") openNewDocDialog(true);
    else if (action === "loadProject") openProjectPicker();
  }

  return {
    newDocOpen, setNewDocOpen, newDocFromProject, openNewDocDialog,
    shortcutsOpen, setShortcutsOpen,
    confirmAction, confirmStep,
    handleNewProjectClick, handleLoadProjectClick, handleConfirmProceed, handleConfirmCancel, handleConfirmYes,
  };
}
