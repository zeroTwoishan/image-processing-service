import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * A toast handed over by the page we came from, through navigation state: "Photo deleted" has to show on the
 * gallery, after the deleted photo's page is gone. It's read once on arrival, then dropped from this history
 * entry, so Back or a refresh doesn't show it again. The rest of the state (gallerySearch...) is kept.
 * Returns [toast, showToast, closeToast]; closeToast is stable, so Toast's auto-close timer isn't restarted
 * by every re-render of the page.
 */
export function useFlashToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(location.state?.toast ?? null);

  useEffect(() => {
    if (!location.state?.toast) return;
    const { toast: _handedOver, ...rest } = location.state;
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: rest });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on arrival

  const closeToast = useCallback(() => setToast(null), []);
  return [toast, setToast, closeToast];
}

export default useFlashToast;
