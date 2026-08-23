import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    NavBar, HeroSection, SafetySection, LiveStatsBar, EmergencyFeed,
    FeaturesSection, PortalSection, AiShowcase, ImpactShowcase, Architecture,
    EmergencyTimeline, WhyLifeLink, MLModelsSection, ResearchSection,
    AppStrengthsSection, Partners, CTASection, TechStack, Footer,
} from './landingSections';
import ResearchPaperModal from '../components/ResearchPaperModal';

// ─── Hook: Animated Counter ─────────────────────────────

const LandingPage = () => {
    const navigate = useNavigate();
    const [heroEntered, setHeroEntered] = useState(false);
    useEffect(() => { setTimeout(() => setHeroEntered(true), 100); }, []);
    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans relative overflow-hidden">
            {/* Continuously flowing role-colored background */}
            <div className="fixed inset-0 pointer-events-none animate-role-aurora z-0"
                style={{
                    backgroundImage: `
                        radial-gradient(ellipse at 20% 30%, rgba(37,99,235,0.12) 0%, transparent 55%),
                        radial-gradient(ellipse at 80% 20%, rgba(5,150,105,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 80%, rgba(124,58,237,0.1) 0%, transparent 50%)
                    `,
                }}>
            </div>
            <div className="fixed inset-0 pointer-events-none animate-role-aurora z-0"
                style={{
                    animationDelay: '-9s',
                    backgroundImage: `
                        radial-gradient(ellipse at 60% 40%, rgba(249,115,22,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 10% 70%, rgba(220,38,38,0.08) 0%, transparent 50%)
                    `,
                }}>
            </div>
            <div className="relative z-10">
            <NavBar navigate={navigate} />
            <HeroSection entered={heroEntered} />
            <SafetySection />
            <LiveStatsBar />
            <EmergencyFeed />
            <FeaturesSection />
            <PortalSection />
            <AiShowcase />
            <ImpactShowcase />
            <Architecture />
            <EmergencyTimeline />
            <WhyLifeLink />
            <MLModelsSection />
            <ResearchSection />
            <AppStrengthsSection />
            <Partners />
            <CTASection />
            <TechStack />
            <Footer />
            </div>
        </div>
    );
};

export default LandingPage;
