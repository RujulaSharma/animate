import React from 'react';
import { motion } from 'motion/react';
const items = [
 { id:'learn', n:'01', icon:'◇', title:'Learn', subtitle:'Curiosity into capability.', desc:'Follow guided roadmaps, learn concepts that matter, and grow your confidence one challenge at a time.', tag:'Courses · Roadmaps' },
 { id:'build', n:'02', icon:'⌘', title:'Build', subtitle:'Ideas into something real.', desc:'Bring ideas to life with hands-on projects, coding practice, and a creative workspace made for builders.', tag:'Projects · Practice' },
 { id:'connect', n:'03', icon:'✳', title:'Connect', subtitle:'Find your people.', desc:'Join a community of makers, take on hackathons, share your work, and discover what is possible together.', tag:'Hackathons · Community' }
];
export default function Features({ selected }) { return <section id="features" className="features-section"><div className="features-inner">
 <div className="section-heading"><span className="mini-label">THE DEVHARBOUR UNIVERSE</span><h2>From first spark<br/>to <em>what's next.</em></h2><p>Three paths. One place to make progress.</p></div>
 <div className="feature-list">{items.map(item => <motion.article key={item.id} id={item.id} className={`feature-card ${selected === item.title ? 'selected' : ''}`} initial={{ opacity:0, y:65 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:false, amount:.18 }} transition={{ duration:.65 }}><div className="feature-number">{item.n} / 03</div><div className="feature-glyph">{item.icon}</div><div className="feature-copy"><span className="feature-tag">{item.tag}</span><h3>{item.title}<span className="feature-arrow">↗</span></h3><h4>{item.subtitle}</h4><p>{item.desc}</p></div></motion.article>)}</div>
 </div></section> }
