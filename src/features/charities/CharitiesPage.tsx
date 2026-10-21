import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Charity } from '../../types';

const mockCharities: Charity[] = [
  {
    id: '1',
    name: 'Fairway Green Youth Foundation',
    slug: 'fairway-green-youth',
    tagline: 'Opening golf and mentorship to underprivileged young athletes.',
    description: 'Provides equipment, PGA coaching, and life skills programs to young golfers from low-income communities.',
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
    description: 'Works with golf clubs to transform non-play roughs into biodiversity sanctuaries and wild pollinator meadows.',
    category: 'environment',
    is_featured: true,
    total_raised_cents: 2850000,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Veterans on the Green',
    slug: 'veterans-on-the-green',
    tagline: 'Rehabilitation and mental health through adaptive golf.',
    description: 'Supports wounded military veterans through adaptive equipment, PTSD therapy, and community golf leagues.',
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
    description: 'Safeguards municipal courses from commercial redevelopment, keeping golf accessible to urban communities.',
    category: 'community',
    is_featured: false,
    total_raised_cents: 640000,
    created_at: '2026-10-01T00:00:00Z',
  },
];

export const CharitiesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const charities = mockCharities;

  const filtered = charities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <PageContainer>
      <div style={{ maxWidth: '800px', margin: '0 auto var(--space-10)', textAlign: 'center' }}>
        <Badge variant="lime" style={{ marginBottom: 'var(--space-2)' }}>
          Charity Directory (§ 08.2)
        </Badge>
        <h2>Causes That Reshape Communities</h2>
        <p>
          Every GreenPulse subscriber directs at least 10% of their subscription to their chosen cause.
          Explore our verified partners or make an independent donation.
        </p>
      </div>

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
        </div>
      </div>

      {/* Charity Grid */}
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
    </PageContainer>
  );
};
