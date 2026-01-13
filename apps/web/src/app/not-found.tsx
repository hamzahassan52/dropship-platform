import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 700, color: 'var(--gray-200)', marginBottom: '1rem' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--gray-500)', marginBottom: '2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="btn btn-primary">
        <Home size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
