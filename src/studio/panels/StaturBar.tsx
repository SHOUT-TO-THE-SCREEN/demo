import "./panels.css";

export default function StatusBar() {
  return (
    <footer className="tdStatusBar">
      <div className="tdStatusBar__left">Ready</div>
      <div className="tdStatusBar__right">Network · Params · Preview</div>
    </footer>
  );
}
