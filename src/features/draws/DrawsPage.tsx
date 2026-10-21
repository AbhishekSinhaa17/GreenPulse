import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ScoreBall } from '../../components/ui/ScoreBall';
import { Clock } from 'lucide-react';
import { drawService } from '../../services/drawService';
import { useAuth } from '../../hooks/useAuth';
import type { MonthlyDraw } from '../../types';

export const DrawsPage: React.FC = () => {
  const { isConfigured } = useAuth();
  const [publishedDraws, setPublishedDraws] = useState<MonthlyDraw[]>([]);

  useEffect(() => {
    if (isConfigured) {
      drawService.getPublishedDraws().then((draws) => {
        setPublishedDraws(draws);
      });
    }
  }, [isConfigured]);

  // If DB returned published draws, use the most recent; otherwise display default PRD cycle
  const latestDraw = publishedDraws.length > 0 ? publishedDraws[0] : null;

  return (
    <PageContainer>
      <div style={{ maxWidth: '800px', margin: '0 auto var(--space-8)', textAlign: 'center' }}>
        <div className="flex justify-center items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
          <Badge variant="forest">Monthly Draw & Reward Engine (§ 06, § 07)</Badge>
          <Badge variant={isConfigured && latestDraw ? 'success' : 'neutral'}>
            {isConfigured && latestDraw ? 'Live Supabase Cycle' : 'Scheduled Cycle'}
          </Badge>
        </div>
        <h2>The Monthly Draw. High Stakes, Lasting Purpose.</h2>
        <p>
          Each month, 5 winning numbers between 1 and 45 are drawn. Your active 5 Stableford scores
          act as your monthly draw ticket. 40% of subscription revenue funds the prize pool with
          jackpot rollover.
        </p>
      </div>

      {/* Main Prize Pool Card */}
      <div style={{ maxWidth: '960px', margin: '0 auto var(--space-8)' }}>
        <Card variant="warm" style={{ border: '1px solid var(--border-default)', padding: 'var(--space-8)' }}>
          <div className="flex flex-col md-flex-row justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
                <Badge variant="lime">
                  {latestDraw ? `Cycle: ${latestDraw.draw_month}` : 'Upcoming Draw: October 2026'}
                </Badge>
                <span className="flex items-center gap-1 text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  <Clock size={14} /> {latestDraw ? 'Published Draw Result' : 'Scheduled Cycle'}
                </span>
              </div>
              <h3 style={{ fontSize: 'var(--text-3xl)', color: 'var(--forest-950)' }}>
                {latestDraw
                  ? `Verified Pool: £${(latestDraw.total_prize_pool_cents / 100).toLocaleString()}`
                  : 'Estimated Pool: £28,450'}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--charcoal-700)', marginTop: 'var(--space-1)' }}>
                {latestDraw
                  ? `${latestDraw.jackpot_rolled_over ? 'Tier 1 Jackpot unclaimed — Rollover enabled.' : 'Prizes allocated across all tiers.'}`
                  : 'Includes £8,200 rollover from September 5-Number Jackpot.'}
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Eligible Subscribers
              </span>
              <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--forest-800)' }}>
                {latestDraw ? latestDraw.total_eligible_subscribers.toLocaleString() : '1,498'}
              </div>
            </div>
          </div>

          {/* Tier Pot Allocations */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-8)',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-1)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>5-Number Match</span>
                <Badge variant="forest" size="sm">40% + Rollover</Badge>
              </div>
              <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--forest-800)' }}>
                £{latestDraw ? (latestDraw.tier_5_pot_cents / 100).toLocaleString() : '19,580'}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                ✓ Rollover enabled if unclaimed
              </span>
            </div>

            <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-1)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>4-Number Match</span>
                <Badge variant="neutral" size="sm">35% Share</Badge>
              </div>
              <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--charcoal-900)' }}>
                £{latestDraw ? (latestDraw.tier_4_pot_cents / 100).toLocaleString() : '9,957'}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Split equally among tier winners
              </span>
            </div>

            <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-1)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>3-Number Match</span>
                <Badge variant="neutral" size="sm">25% Share</Badge>
              </div>
              <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--charcoal-900)' }}>
                £{latestDraw ? (latestDraw.tier_3_pot_cents / 100).toLocaleString() : '7,112'}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Split equally among tier winners
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Past Published Draw Showcase */}
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h4 style={{ marginBottom: 'var(--space-4)' }}>
          {latestDraw ? latestDraw.draw_title : 'Last Published Result: September 2026'}
        </h4>
        <Card>
          <div className="flex flex-col md-flex-row justify-between items-center gap-6">
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Winning Draw Numbers
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                {(latestDraw?.winning_numbers || [14, 27, 33, 38, 42]).map((num) => (
                  <ScoreBall key={num} number={num} status="winning" />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>5-Match Winners</span>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-warning)' }}>
                  {latestDraw ? `${latestDraw.tier_5_winners_count} (Rolled Over)` : '0 (Rolled Over)'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>4-Match Winners</span>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                  {latestDraw ? `${latestDraw.tier_4_winners_count} winners` : '3 (£2,840 each)'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>3-Match Winners</span>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                  {latestDraw ? `${latestDraw.tier_3_winners_count} winners` : '28 (£190 each)'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
