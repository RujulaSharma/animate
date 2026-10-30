import React from 'react';
import { motion } from 'motion/react';
const appear = { hidden: { opacity: 0, y: 27 }, visible: { opacity: 1, y: 0 } };
export default function Hero({ setMode }) {
  return <div className="hero-content"><motion.div className="eyebrow" initial="hidden" animate="visible" variants={appear} transition={{ delay: .18 }}>✦ &nbsp; A PLACE FOR THE NEXT GENERATION OF BUILDERS</motion.div>
    <motion.h1 initial="hidden" animate="visible" variants={appear} transition={{ delay: .3, duration: .8 }}>Build what you <em>imagine.</em></motion.h1>
    <motion.p className="hero-description" initial="hidden" animate="visible" variants={appear} transition={{ delay: .48, duration: .7 }}>Learn new skills. Create meaningful projects. Explore opportunities. Build your future with DevHarbour.</motion.p>
    <motion.div className="hero-actions" initial="hidden" animate="visible" variants={appear} transition={{ delay: .65 }}><motion.button whileHover={{ y: -3, scale: 1.025 }} whileTap={{ scale: .96 }} className="button-primary" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>Start Building <span>↗</span></motion.button><motion.button whileHover={{ y: -3 }} whileTap={{ scale: .97 }} className="button-secondary" onClick={() => setMode('clusters')}>Explore DevHarbour <span>↗</span></motion.button></motion.div>
    <motion.div className="hero-footnote" initial="hidden" animate="visible" variants={appear} transition={{ delay: .9 }}><div className="footnote-line"/><span>ONE PLACE. INFINITE POSSIBILITIES.</span></motion.div>
  </div>;
}

