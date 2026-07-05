import { type ReactNode, useState } from 'react';
import {
  KernButton,
  KernHeading,
  KernText,
  type KernIconType,
} from '@kern-ux-annex/kern-react-kit';

interface PanelFrameProps {
  /** Placement modifier, e.g. `cp--filter` or `cp--legend`. */
  modifier: string;
  /** Label + icon for the collapsed toggle button. */
  toggleLabel: string;
  toggleIcon: KernIconType;
  /** Header content when expanded. */
  preline?: string;
  title: string;
  children: ReactNode;
}

/**
 * A floating, collapsible KERN card shared by the filter and legend panels.
 * Owns only the open/closed chrome (toggle button, header, body frame); the
 * panel-specific content is passed as children. Defaults to open on wider
 * viewports and collapsed on phones so it never buries the map.
 */
export function PanelFrame({
  modifier,
  toggleLabel,
  toggleIcon,
  preline,
  title,
  children,
}: PanelFrameProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={`cp cp--collapsed ${modifier}`}>
        <KernButton
          label={toggleLabel}
          icon={toggleIcon}
          iconPosition="left"
          variant="primary"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        />
      </div>
    );
  }

  return (
    <section className={`cp ${modifier}`} aria-label={title}>
      <header className="cp__header">
        <div className="cp__titles">
          {preline && <KernText type="preline">{preline}</KernText>}
          <KernHeading level={2} size="small">
            {title}
          </KernHeading>
        </div>
        <KernButton
          icon="close"
          alt="Bedienfeld schließen"
          variant="tertiary"
          aria-expanded
          onClick={() => setOpen(false)}
        />
      </header>
      <div className="cp__body">{children}</div>
    </section>
  );
}
