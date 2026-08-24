import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import ResponsiveGrid, {
    ResponsiveCard,
    ResponsiveTable,
    ResponsiveHeader,
    ResponsiveTabs,
    MobileDrawer,
    MobileNav,
} from '../components/layout/ResponsiveGrid';

// ============================================================
// ResponsiveGrid Tests
// ============================================================
describe('ResponsiveGrid', () => {
    it('renders children', () => {
        render(
            <ResponsiveGrid>
                <div data-testid="child">Hello</div>
            </ResponsiveGrid>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('applies grid classes', () => {
        const { container } = render(
            <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }}>
                <div>Item 1</div>
            </ResponsiveGrid>
        );
        expect(container.firstChild).toHaveClass('grid');
    });

    it('applies custom className', () => {
        const { container } = render(
            <ResponsiveGrid className="my-custom-class">
                <div>Item</div>
            </ResponsiveGrid>
        );
        expect(container.firstChild).toHaveClass('my-custom-class');
    });
});

// ============================================================
// ResponsiveCard Tests
// ============================================================
describe('ResponsiveCard', () => {
    it('renders children', () => {
        render(
            <ResponsiveCard>
                <div data-testid="card-content">Content</div>
            </ResponsiveCard>
        );
        expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('applies padding by default', () => {
        const { container } = render(
            <ResponsiveCard>
                <div>Content</div>
            </ResponsiveCard>
        );
        expect(container.firstChild).toHaveClass('p-3');
    });

    it('can disable padding', () => {
        const { container } = render(
            <ResponsiveCard padding={false}>
                <div>Content</div>
            </ResponsiveCard>
        );
        expect(container.firstChild).not.toHaveClass('p-3');
    });
});

// ============================================================
// ResponsiveHeader Tests
// ============================================================
describe('ResponsiveHeader', () => {
    it('renders title', () => {
        render(<ResponsiveHeader title="Dashboard" />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders subtitle', () => {
        render(<ResponsiveHeader title="Dashboard" subtitle="Overview" />);
        expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('renders actions', () => {
        render(
            <ResponsiveHeader
                title="Dashboard"
                actions={<button data-testid="action-btn">Add</button>}
            />
        );
        expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    });
});

// ============================================================
// ResponsiveTabs Tests
// ============================================================
describe('ResponsiveTabs', () => {
    const tabs = [
        { key: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
        { key: 'details', label: 'Details', icon: 'fa-list' },
        { key: 'settings', label: 'Settings', icon: 'fa-cog' },
    ];

    it('renders all tabs', () => {
        render(<ResponsiveTabs tabs={tabs} activeTab="overview" onChange={() => {}} />);
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Details')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('calls onChange when tab clicked', () => {
        let changed = null;
        render(<ResponsiveTabs tabs={tabs} activeTab="overview" onChange={(key) => { changed = key; }} />);
        fireEvent.click(screen.getByText('Details'));
        expect(changed).toBe('details');
    });

    it('shows count badge', () => {
        const tabsWithCount = [...tabs, { key: 'alerts', label: 'Alerts', count: 5 }];
        render(<ResponsiveTabs tabs={tabsWithCount} activeTab="overview" onChange={() => {}} />);
        expect(screen.getByText('5')).toBeInTheDocument();
    });
});

// ============================================================
// MobileDrawer Tests
// ============================================================
describe('MobileDrawer', () => {
    it('renders nothing when closed', () => {
        const { container } = render(
            <MobileDrawer isOpen={false} onClose={() => {}}>
                <div>Content</div>
            </MobileDrawer>
        );
        expect(container.innerHTML).toBe('');
    });

    it('renders content when open', () => {
        render(
            <MobileDrawer isOpen={true} onClose={() => {}}>
                <div data-testid="drawer-content">Menu Item</div>
            </MobileDrawer>
        );
        expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
    });

    it('calls onClose when overlay clicked', () => {
        let closed = false;
        render(
            <MobileDrawer isOpen={true} onClose={() => { closed = true; }}>
                <div>Content</div>
            </MobileDrawer>
        );
        // The overlay div has bg-black/50
        const overlay = document.querySelector('.bg-black\\/50');
        if (overlay) fireEvent.click(overlay);
        expect(closed).toBe(true);
    });
});

// ============================================================
// MobileNav Tests
// ============================================================
describe('MobileNav', () => {
    const items = [
        { key: 'home', label: 'Home', icon: 'fa-home' },
        { key: 'alerts', label: 'Alerts', icon: 'fa-bell' },
        { key: 'patients', label: 'Patients', icon: 'fa-users' },
    ];

    it('renders all nav items', () => {
        render(<MobileNav items={items} activeKey="home" onChange={() => {}} />);
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Alerts')).toBeInTheDocument();
        expect(screen.getByText('Patients')).toBeInTheDocument();
    });

    it('calls onChange when item clicked', () => {
        let changed = null;
        render(<MobileNav items={items} activeKey="home" onChange={(key) => { changed = key; }} />);
        fireEvent.click(screen.getByText('Alerts'));
        expect(changed).toBe('alerts');
    });
});

// ============================================================
// ResponsiveTable Tests
// ============================================================
describe('ResponsiveTable', () => {
    it('renders children in scrollable container', () => {
        render(
            <ResponsiveTable>
                <table>
                    <tbody><tr><td>Data</td></tr></tbody>
                </table>
            </ResponsiveTable>
        );
        expect(screen.getByText('Data')).toBeInTheDocument();
    });
});
