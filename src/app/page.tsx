'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Users, Trophy, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
      background: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'sans-serif'
    }}>
      {/* Animated Background Blobs */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: 0 }}>
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '50vw',
            height: '50vw',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }}
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '60vw',
            height: '60vw',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.1) 0%, rgba(15, 23, 42, 0) 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }}
        />
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
        backdropFilter: 'blur(10px)',
        background: 'rgba(15, 23, 42, 0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }} className="text-gradient">Stock League</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#94a3b8', fontWeight: '500', fontSize: '0.9rem', transition: 'color 0.2s' }}>
            Sign In
          </Link>
          <Link href="/dashboard" className="btn-primary" style={{
            background: 'linear-gradient(135deg, #34d399 0%, #22d3ee 100%)',
            color: '#0f172a',
            padding: '0.6rem 1.2rem',
            borderRadius: '999px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Dashboard <ChevronRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 6rem' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#34d399',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              fontWeight: '600'
            }}>
              ✨ The #1 Fantasy Stock Market Game
            </span>
            <h1 style={{
              fontSize: 'clamp(3rem, 6vw, 5rem)',
              fontWeight: 'bold',
              lineHeight: 1.1,
              marginBottom: '1.5rem'
            }}>
              Invest. Compete.<br />
              <span className="text-gradient">Win Big.</span>
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '2.5rem'
            }}>
              Create leagues, draft real stocks with virtual money, and compete with friends to see who has the best portfolio. All the thrill, none of the risk.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/login" className="btn-primary" style={{
                background: 'white',
                color: '#0f172a',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none'
              }}>
                Start Playing <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <FeatureCard
            icon={<Users size={32} />}
            title="Create Leagues"
            desc="Invite friends with a simple code. Set budgets, deadlines, and rules."
            delay={0.2}
          />
          <FeatureCard
            icon={<TrendingUp size={32} />}
            title="Real-Time Data"
            desc="Draft stocks using live market data. Monitor your portfolio performance instantly."
            delay={0.4}
          />
          <FeatureCard
            icon={<Trophy size={32} />}
            title="Global Leaderboards"
            desc="Rise through the ranks. Track your returns against friends and the global community."
            delay={0.6}
          />
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        color: '#64748b',
        position: 'relative',
        zIndex: 10,
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <p>&copy; {new Date().getFullYear()} Stock League. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: any, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '2rem',
        borderRadius: '16px',
        transition: 'transform 0.2s',
        cursor: 'default'
      }}
      whileHover={{ y: -5, background: 'rgba(30, 41, 59, 0.6)' }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #34d399 0%, #22d3ee 100%)',
        width: 'fit-content',
        padding: '0.75rem',
        borderRadius: '12px',
        color: '#0f172a',
        marginBottom: '1.5rem'
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>{title}</h3>
      <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
  );
}
