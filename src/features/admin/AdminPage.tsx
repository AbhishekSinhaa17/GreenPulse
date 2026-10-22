import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import { drawService } from '../../services/drawService';
import type { EligibleSubscriberEntry } from '../../services/drawEngine';
import type {
  UserProfile,
  WinnerClaim,
  MonthlyDraw,
  Charity,
  PlatformAnalytics,
} from '../../types';
import { AdminHeader, type AdminTab } from './components/AdminHeader';
import { UsersSection } from './components/UsersSection';
import { DrawSection } from './components/DrawSection';
import { CharitiesSection } from './components/CharitiesSection';
import { WinnersSection } from './components/WinnersSection';
import { AnalyticsSection } from './components/AnalyticsSection';

const VALID_ADMIN_TABS: AdminTab[] = ['analytics', 'draw', 'winners', 'users', 'charities'];

export const AdminPage: React.FC = () => {
  const { user, isConfigured } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;

  const activeTab: AdminTab =
    tabParam && VALID_ADMIN_TABS.includes(tabParam) ? tabParam : 'analytics';

  const handleSelectTab = (tab: AdminTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  // Master Data State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [claimsList, setClaimsList] = useState<WinnerClaim[]>([]);
  const [publishedDraws, setPublishedDraws] = useState<MonthlyDraw[]>([]);
  const [eligibleSubscribers, setEligibleSubscribers] = useState<EligibleSubscriberEntry[]>([]);
  const [carriedOverJackpotCents, setCarriedOverJackpotCents] = useState(0);
  const [charitiesList, setCharitiesList] = useState<Charity[]>([]);
  const [analyticsData, setAnalyticsData] = useState<PlatformAnalytics | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(() => isConfigured);

  const loadAdminData = useCallback(async () => {
    if (!isConfigured) return;
    setIsLoadingData(true);
    try {
      const [u, c, draws, eligible, rolloverInfo, charities, analytics] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllWinnerClaims(),
        drawService.getPublishedDraws(),
        adminService.getEligibleSubscribers(),
        adminService.getLatestRollover(),
        adminService.getAllCharitiesAdmin(),
        adminService.getPlatformAnalytics(),
      ]);
      setUsersList(u);
      setClaimsList(c);
      setPublishedDraws(draws);
      setEligibleSubscribers(eligible);
      setCarriedOverJackpotCents(rolloverInfo.carriedOverJackpotCents);
      setCharitiesList(charities);
      setAnalyticsData(analytics);
    } catch (err: unknown) {
      console.error('[AdminPage] Failed to fetch admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    let isMounted = true;
    if (!isConfigured) return;
    Promise.all([
      adminService.getAllUsers(),
      adminService.getAllWinnerClaims(),
      drawService.getPublishedDraws(),
      adminService.getEligibleSubscribers(),
      adminService.getLatestRollover(),
      adminService.getAllCharitiesAdmin(),
      adminService.getPlatformAnalytics(),
    ])
      .then(([u, c, draws, eligible, rolloverInfo, charities, analytics]) => {
        if (!isMounted) return;
        setUsersList(u);
        setClaimsList(c);
        setPublishedDraws(draws);
        setEligibleSubscribers(eligible);
        setCarriedOverJackpotCents(rolloverInfo.carriedOverJackpotCents);
        setCharitiesList(charities);
        setAnalyticsData(analytics);
      })
      .catch((err: unknown) => {
        console.error('[AdminPage] Failed to fetch initial admin data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  return (
    <PageContainer>
      {/* 0. Admin Operations Header & Tab Strip */}
      <AdminHeader
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isConfigured={isConfigured}
        isLoadingData={isLoadingData}
        onRefresh={loadAdminData}
        claimsCount={claimsList.length}
        usersCount={usersList.length}
        charitiesCount={charitiesList.length}
      />

      {/* 1. Surface 02: Draw Simulation & Orchestration */}
      {activeTab === 'draw' && (
        <DrawSection
          eligibleSubscribers={eligibleSubscribers}
          publishedDraws={publishedDraws}
          carriedOverJackpotCents={carriedOverJackpotCents}
          currentUserId={user?.id}
          isConfigured={isConfigured}
          onRefresh={loadAdminData}
        />
      )}

      {/* 2. Surface 04: Winners Verification Queue */}
      {activeTab === 'winners' && (
        <WinnersSection
          claimsList={claimsList}
          usersList={usersList}
          currentUserId={user?.id}
          isConfigured={isConfigured}
          onRefresh={loadAdminData}
        />
      )}

      {/* 3. Surface 01: User & Subscription Registry */}
      {activeTab === 'users' && (
        <UsersSection
          usersList={usersList}
          onRefresh={loadAdminData}
          currentUserId={user?.id}
        />
      )}

      {/* 4. Surface 03: Charity Partner Management */}
      {activeTab === 'charities' && (
        <CharitiesSection
          charitiesList={charitiesList}
          isConfigured={isConfigured}
          onRefresh={loadAdminData}
        />
      )}

      {/* 5. Surface 05: Reports & Platform Analytics */}
      {activeTab === 'analytics' && (
        <AnalyticsSection
          analyticsData={analyticsData}
          totalUsers={usersList.length}
          totalDraws={publishedDraws.length}
          totalCharities={charitiesList.length}
        />
      )}
    </PageContainer>
  );
};
