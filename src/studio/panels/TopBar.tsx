import "./panels.css";

export default function TopBar({ title }: { title: string }) {
  return (
    <header className="tdTopBar">
      <div className="tdTopBar__left">{title}</div>
      <div className="tdTopBar__right">
        <span className="tdBadge">LOCAL</span>
        <span className="tdBadge">FPS</span>
      </div>
    </header>
  );
}
