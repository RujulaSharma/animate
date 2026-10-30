import React, { useState } from 'react';
import { motion } from 'motion/react';
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const go = (id) => { setOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  return <header className="site-header"><nav className="nav-shell" aria-label="Main navigation">
    <button className="brand" onClick={() => go('home')} aria-label="DevHarbour home"><span className="brand-mark">D<span>H</span></span>Dev<span className="brand-light">Harbour</span></button>
    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">{open ? '✕' : '☰'}</button>
    <div className={`nav-links ${open ? 'is-open' : ''}`}>{[['Learn','learn'],['Practice','build'],['Build','build'],['Explore','features'],['Community','connect']].map(([label,id]) => <button key={label} onClick={() => go(id)}>{label}</button>)}</div>
    <motion.button whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }} className="nav-cta" onClick={() => go('features')}>Get Started <span>↗</span></motion.button>
  </nav></header>;
}
