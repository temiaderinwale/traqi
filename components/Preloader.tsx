/* Traqi — full-screen brand curtain.
   Shown while the session resolves, and held over /auth from the moment
   credentials are accepted until the dashboard takes over, so the sign-in
   form never flashes back on the way in. */

import { Mark, Wordmark } from './Brand';

export default function Preloader() {
  return (
    <div className="preloader">
      <div className="preloader-inner">
        <Mark size={64} /><div className="pl-word"><Wordmark /></div>
        <div className="pl-track"><div className="pl-fill" /></div>
      </div>
    </div>
  );
}
