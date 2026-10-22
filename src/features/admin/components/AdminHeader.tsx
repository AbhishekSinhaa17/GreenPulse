import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Trophy,
  CheckSquare,
  Users,
  Heart,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

export type AdminTab = 'draw' | 'winners' | 'users' | 'charities' | 'analytics';

interface AdminHeaderProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isConfigured: boolean;
  isLoadingData: boolean;
  onRefresh: () => void;
  claimsCount: number;
  usersCount: number;
  charitiesCount: number;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onSelectTab,
  isConfigured,
  isLoadingData,
  onRefresh,
  claimsCount,
  usersCount,
  charitiesCount,
}) => {
  return (
    <div
      className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4"
      style={{
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div>
        <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-1)' }}>
          <Badge variant="forest">Platform Operations Console</Badge>
          <Badge variant={isConfigured ? 'success' : 'neutral'}>
            {isConfigured ? 'Live Database Connected' : 'Setup Required'}
          </Badge>
        </div>
        <h2 style={{ color: 'var(--forest-950)' }}>Operations & Platform Control</h2>
      </div>

      <div className="admin-tab-strip">
        <Button
          variant={activeTab === 'analytics' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onSelectTab('analytics')}
          leftIcon={<BarChart3 size={14} />}
        >
          Overview & Analytics
        </Button>
        <Button
          variant={activeTab === 'draw' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onSelectTab('draw')}
          leftIcon={<Trophy size={14} />}
        >
          Draw Engine
        </Button>
        <Button
          variant={activeTab === 'winners' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onSelectTab('winners')}
          leftIcon={<CheckSquare size={14} />}
        >
          Winner Claims ({claimsCount})
        </Button>
        <Button
          variant={activeTab === 'users' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onSelectTab('users')}
          leftIcon={<Users size={14} />}
        >
          Members & Score Auditing ({usersCount})
        </Button>
        <Button
          variant={activeTab === 'charities' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onSelectTab('charities')}
          leftIcon={<Heart size={14} />}
        >
          Charity Directory ({charitiesCount})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          isLoading={isLoadingData}
          onClick={onRefresh}
          leftIcon={<RefreshCw size={14} />}
          title="Refresh database records"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};
