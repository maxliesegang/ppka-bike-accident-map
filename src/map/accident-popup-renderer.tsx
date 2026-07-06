import { renderToStaticMarkup } from 'react-dom/server';
import { AccidentPopup } from '../ui/popups/AccidentPopup';

/**
 * Renders popup content for arbitrary feature properties to a static HTML
 * string, using the Kern UX `AccidentPopup` component. React escapes all
 * values, so untrusted dataset fields cannot inject markup.
 */
export function renderAccidentPopup(
  properties: Record<string, unknown> | null | undefined,
): string {
  return renderToStaticMarkup(<AccidentPopup properties={properties} />);
}
