import type { ReactNode } from "react";

interface SceneProps {
  id: string;
  className: string;
  children: ReactNode;
  overlay?: ReactNode;
}

export default function Scene({
  id,
  className,
  children,
  overlay,
}: SceneProps): React.ReactElement {
  return (
    <section id={id} className="scene">
      <div className="scene-sticky">
        <div className="scene-scale">
          <div className={`scene-card ${className}`}>{children}</div>
          <div className="scene-dim" aria-hidden="true" />
        </div>
      </div>
      {overlay}
    </section>
  );
}
