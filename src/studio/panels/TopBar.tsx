// src/.../TopBar.tsx
import "./panels.css";
import { useNavigate } from "react-router-dom";

export default function TopBar({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <header className="tdTopBar">
      <div className="tdTopBar__left">
        <button
          type="button"
          className="tdBrand"
          onClick={() => navigate("/list")}
          title="Back to List"
          aria-label="App Logo"
        >
          <span className="tdBrand__icon" aria-hidden="true">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0)">
                <path
                  d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z"
                  fill="currentColor"
                />
              </g>
              <defs>
                <clipPath id="clip0">
                  <rect fill="white" height="48" width="48" />
                </clipPath>
              </defs>
            </svg>
          </span>
          <span className="tdBrand__text">CodeGraph Studio</span>
        </button>

        <span className="tdTopBar__title">{title}</span>
      </div>

      <div className="tdTopBar__right">
        <span className="tdBadge">LOCAL</span>
        <span className="tdBadge">FPS</span>
      </div>
    </header>
  );
}
