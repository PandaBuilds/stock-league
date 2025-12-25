import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '2rem',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 className="text-gradient" style={{ fontSize: '4rem', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        Stock League
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#a1a1aa', maxWidth: '600px' }}>
        Compete with friends and family. Show off your portfolio returns.
        High stakes, real-time data, premium vibes.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link href="/login" className="btn-primary">
          Start a League
        </Link>
        <Link href="/login" className="glass-panel" style={{ padding: '0.75rem 1.5rem', borderRadius: '9999px', transition: 'background 0.2s' }}>
          Join Existing
        </Link>
      </div>
    </div>
  );
}
