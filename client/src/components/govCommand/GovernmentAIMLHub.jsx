import React from 'react';

export const GovernmentAIMLHub = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OutbreakForecast />
            <AllocationPredictor />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PolicyAdvisor />
            <AvailabilityPredictor />
        </div>
    </div>
);
