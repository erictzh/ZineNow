// Busy and error status shared across the app: "Loading…" and the red error bar.

const { useState } = React;

export function useStatus() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  return { loading, setLoading, errorMsg, setErrorMsg };
}
