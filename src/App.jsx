import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import ParticleOrb from './components/ParticleOrb';
export default function App() {
 const [mode,setMode] = useState('orb'); const [scroll,setScroll] = useState(0); const [selected,setSelected] = useState(null); const reduce = useReducedMotion();
 useEffect(() => { let raf=0; const update=()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>setScroll(Math.min(1, window.scrollY / Math.max(1,window.innerHeight * 1.18)))); }; update(); window.addEventListener('scroll',update,{passive:true}); window.addEventListener('resize',update); return ()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',update);window.removeEventListener('resize',update)}; },[]);
 const selectCluster = (item) => { setSelected(item); document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block:'center' }); };
 return <><Navbar/><main><section className="hero" id="home"><div className="hero-grid" aria-hidden="true"/><div className="hero-layout"><Hero setMode={setMode}/><div className="hero-art"><ParticleOrb mode={mode} setMode={setMode} scroll={scroll} onCluster={selectCluster}/></div></div><motion.button className="scroll-cue" onClick={() => document.getElementById('features').scrollIntoView({behavior:'smooth'})} animate={reduce ? {} : { y:[0,7,0] }} transition={{repeat:Infinity,duration:2.4}}>SCROLL TO DISCOVER <span>↓</span></motion.button><div className="hero-index">CREATED TO CREATE. &nbsp; / &nbsp; EST. 2026</div></section><Features selected={selected}/><section className="closing-section"><span className="mini-label">YOUR NEXT CHAPTER STARTS HERE</span><h2>Don't just dream it.<br/><em>Build it.</em></h2><button className="button-primary" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>Back to the universe ↑</button></section></main><footer className="footer"><span>✦ &nbsp; DevHarbour</span><span>Learn. Build. Connect.</span><span>© 2026 DevHarbour · Interactive concept</span></footer>
 <AnimatePresence>{selected && <motion.div className="floating-selection" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0,y:15}} role="status"><span>✦ &nbsp; EXPLORING {selected.toUpperCase()}</span><button aria-label="Dismiss notification" onClick={()=>setSelected(null)}>✕</button></motion.div>}</AnimatePresence></>;
}
