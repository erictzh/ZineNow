// Busy and message status shared across the app: "Loading…", the red error bar and a neutral notice bar.

const { useState } = React;

export function useStatus() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notice, setNotice] = useState(null); // a plain information line, e.g. what Export did with the text
  return { loading, setLoading, errorMsg, setErrorMsg, notice, setNotice };
}
