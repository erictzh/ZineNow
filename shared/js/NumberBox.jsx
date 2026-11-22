// A number box with its − and + buttons beside it: ( number )( − )( + ). A drop-in for <input type="number">: it takes
// the same props (value, onChange, min, max, step, className, aria-label...). shared/js/numberFields.js makes the buttons
// work (installed in each app's main) and shared/styles/numberFields.css draws them.
//
//   steppers={false}   a plain box, no buttons
//   wrapClassName      an extra class on the wrapper, for layout (the box's own className stays on the <input>)

export function NumberBox({ steppers = true, wrapClassName, ...inputProps }) {
  const input = <input type="number" {...inputProps} />;
  if (!steppers) return input;
  const disabled = Boolean(inputProps.disabled);
  return (
    <span className={"zn-num" + (wrapClassName ? " " + wrapClassName : "")}>
      {input}
      <button type="button" className="zn-num-btn" data-zn-step="-1" tabIndex={-1} aria-label="Decrease" title="Decrease" disabled={disabled}>−</button>
      <button type="button" className="zn-num-btn" data-zn-step="1" tabIndex={-1} aria-label="Increase" title="Increase" disabled={disabled}>+</button>
    </span>
  );
}
