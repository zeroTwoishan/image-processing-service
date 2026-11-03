// Motion's animation engine, in its own file. main.jsx loads it after the first render (LazyMotion), so the
// page shows first and the animations switch on a moment later.
import { domAnimation } from 'motion/react';

export default domAnimation;
