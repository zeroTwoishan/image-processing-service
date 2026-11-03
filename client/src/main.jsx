import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LazyMotion, MotionConfig } from 'motion/react';

// The animation engine is downloaded separately, after the first render (see lib/motionFeatures.js).
const loadMotionFeatures = () => import('./lib/motionFeatures.js').then((mod) => mod.default);
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user": every motion animation turns into an instant change for people who ask their OS for less motion */}
    {/* LazyMotion + the small `m` component (instead of `motion`) ships only the animation features we use:
        a fraction of motion's full size. strict: using `motion.div` by mistake throws, so the saving can't silently regress. */}
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);
