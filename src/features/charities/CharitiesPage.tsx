import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { charityService } from '../../services/charityService';
import { useAuth } from '../../hooks/useAuth';
import type { Charity } from '../../types';

// Default vetted partners (fallback when DB is unseeded)
const defaultCharities: Charity[] = [
  {
    id: '1',
    name: 'Fairway Green Youth Foundation',
    slug: 'fairway-green-youth',
    tagline: 'Opening golf and mentorship to underprivileged young athletes.',
    description: 'Provides equipment, PGA junior coaching, and character-building mentorship programs to young golfers from disadvantaged communities across Scotland and northern England.',
    category: 'youth_sports',
    is_featured: true,
    total_raised_cents: 1420000,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Open Course Conservation Trust',
    slug: 'open-course-conservation',
    tagline: 'Rewilding coastal links and protecting native pollinators.',
    description: 'Collaborates with coastal and parkland golf courses to restore natural habitats, seed wild pollinator corridors, and manage wetland reserves along coastal roughs.',
    category: 'environment',
    is_featured: true,
    total_raised_cents: 2850000,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Veterans on the Green',
    slug: 'veterans-on-the-green',
    tagline: 'Rehabilitation, community, and mental health through adaptive golf.',
    description: 'Supports wounded and transitioning military veterans through adaptive swing equipment, PTSD peer counseling, and regional inclusive golf tournaments.',
    category: 'health',
    is_featured: false,
    total_raised_cents: 980000,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Local Parkland Initiative',
    slug: 'local-parkland-initiative',
    tagline: 'Preserving municipal green spaces and public recreation courses.',
    description: 'Safeguards municipal golf courses from urban commercial redevelopment, preserving accessible public fairways and community recreation grounds.',
    category: 'community',
    is_featured: false,
    total_raised_cents: 640000,
    created_at: '2026-10-01T00:00:00Z',
  },
];

export const CharitiesPage: React.FC = () => {
  const { isConfigured } = useAuth();
  const [charities, setCharities] = useState<Charity[]>(defaultCharities);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCharities = useCallback(() => {
    if (!isConfigured) return;

    queueMicrotask(() => setIsLoading(true));
    charityService
      .getCharities()
      .then((data) => {
        if (data && data.length > 0) {
          setCharities(data);
          setIsFromDatabase(true);
        } else {
          setCharities(defaultCharities);
          setIsFromDatabase(false);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load charities.';
        setLoadError(msg);
        setCharities(defaultCharities);
        setIsFromDatabase(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isConfigured]);

  useEffect(() => {
    fetchCharities();
  }, [fetchCharities]);

  const filtered = charities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <PageContainer>
      <div style={{ maxWidth: '800px', margin: '0 auto var(--space-8)', textAlign: 'center' }}>
        <div className="flex justify-center items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
          <Badge variant="lime">Charity Directory (§ 08.2)</Badge>
          <Badge variant={isFromDatabase ? 'success' : 'neutral'}>
            {isFromDatabase ? 'Live Supabase Records' : 'Default Vetted Seed'}
          </Badge>
        </div>
        <h2>Causes That Reshape Communities</h2>
        <p>
          Every GreenPulse subscriber directs at least 10% of their subscription to their chosen cause.
          Explore our vetted partners or make an independent donation.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <AlertCircle size={16} color="var(--color-warning)" />
          <span>Note: {loadError}. Displaying default directory.</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="flex flex-col md-flex-row gap-4 items-center justify-between"
        style={{
          marginBottom: 'var(--space-8)',
          backgroundColor: 'var(--bg-surface)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ flex: 1, width: '100%' }}>
          <Input
            placeholder="Search charities by mission, title, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {['all', 'environment', 'youth_sports', 'health', 'community'].map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All Causes' : cat.replace('_', ' ')}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCharities}
            leftIcon={<RefreshCw size={14} />}
            title="Refresh from Supabase"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Charity Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
          Loading charities from database...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No charities match your search query.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {filtered.map((charity) => (
            <Card key={charity.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-3)' }}>
                <Badge variant={charity.is_featured ? 'lime' : 'neutral'}>
                  {charity.category.replace('_', ' ')}
                </Badge>
                {charity.is_featured && (
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--forest-700)' }}>
                    ★ Featured Partner
                  </span>
                )}
              </div>

              <h4 style={{ color: 'var(--forest-950)', marginBottom: 'var(--space-2)' }}>
                {charity.name}
              </h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--charcoal-600)', marginBottom: 'var(--space-4)', flex: 1 }}>
                {charity.description}
              </p>

              <div
                style={{
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block' }}>
                    Total Raised
                  </span>
                  <span style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, color: 'var(--forest-800)' }}>
                    £{(charity.total_raised_cents / 100).toLocaleString()}
                  </span>
                </div>
                <Button variant="outline" size="sm" rightIcon={<ExternalLink size={14} />}>
                  View Profile
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
};
