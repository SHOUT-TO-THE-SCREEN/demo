import "./panels.css";

export default function OpLibrary() {
  return (
    <div className="tdPanel">
      <div className="tdPanel__hdr">OP Library</div>
      <div className="tdPanel__body">
        <input className="tdInput" placeholder="Search operators..." />
        <div className="tdList">
          <div className="tdList__group">Audio</div>
          <button className="tdItem">audioIn</button>
          <button className="tdItem">fileIn</button>

          <div className="tdList__group">Analyze</div>
          <button className="tdItem">fft</button>
          <button className="tdItem">envelope</button>

          <div className="tdList__group">Output</div>
          <button className="tdItem">output</button>
        </div>

        <div className="tdHint">
          MVP: 더블클릭 생성/드래그 생성은 다음 단계에서 연결합니다.
        </div>
      </div>
    </div>
  );
}
