#!/usr/bin/env python
import re

# Fix DesktopPublicDashboard.jsx imports
path = 'client/src/pages/public/DesktopPublicDashboard.jsx'
with open(path, 'r') as f:
    content = f.read()

# Fix project imports: from '../' -> from '../../' (one level deeper now)
content = content.replace("from '../context/", "from '../../context/")
content = content.replace("from '../config/", "from '../../config/")
content = content.replace("from '../layout/", "from '../../layout/")
content = content.replace("from '../components/", "from '../../components/")
content = content.replace("from '../data/", "from '../../data/")
content = content.replace("from '../hooks/", "from '../../hooks/")
# Fix leaflet imports
content = content.replace("from 'leaflet/dist/", "from 'leaflet/dist/")
# Fix icon imports - they need to stay relative to the public dir now
content = content.replace("from 'leaflet/dist/images/marker-icon.png';", "from 'leaflet/dist/images/marker-icon.png';")
content = content.replace("../pages/", "../../")  # Fix any ../pages/ references

# Replace local file-scope references with proper imports
# fallbackIncidents is now in ./helpers
content = content.replace(
    "const DesktopPublicDashboard",
    "import { fallbackIncidents, SpeechRecognition } from './helpers';\n\nconst DesktopPublicDashboard"
)

with open(path, 'w') as f:
    f.write(content)
print(f'Fixed imports in {path}')

# Fix MobilePublicDashboard.jsx imports
path2 = 'client/src/pages/public/MobilePublicDashboard.jsx'
with open(path2, 'r') as f:
    content = f.read()

# Fix project imports
content = content.replace("from '../context/", "from '../../context/")
content = content.replace("from '../config/", "from '../../config/")
content = content.replace("from '../components/", "from '../../components/")
content = content.replace("from '../data/", "from '../../data/")
content = content.replace("from '../hooks/", "from '../../hooks/")

# Fix local component references - these are now separate files in the same directory
content = re.sub(
    r"import.*?from './PublicShell';?",
    "",
    content
)
content = re.sub(
    r"import.*?from './HomeScreen';?",
    "",
    content
)
content = re.sub(
    r"import.*?from './SmartSosScreen';?",
    "",
    content
)
content = re.sub(
    r"import.*?from './FindHospitalScreen';?",
    "",
    content
)
content = re.sub(
    r"import.*?from './QuickHealthCheckScreen';?",
    "",
    content
)
content = re.sub(
    r"import.*?from './DonorMatchScreen';?",
    "",
    content
)
content = re.sub(
    r"import.*?from './FamilyMonitoringScreen';?",
    "",
    content
)

# Add the proper imports before the component definition
content = re.sub(
    r"(const MobilePublicMenu|const MobilePublicDashboard)",
    r"import PublicShell from './PublicShell';\nimport HomeScreen from './HomeScreen';\nimport SmartSosScreen from './SmartSosScreen';\nimport FindHospitalScreen from './FindHospitalScreen';\nimport QuickHealthCheckScreen from './QuickHealthCheckScreen';\nimport DonorMatchScreen from './DonorMatchScreen';\nimport FamilyMonitoringScreen, { MobileAiChatScreen } from './FamilyMonitoringScreen';\nimport { modules } from './helpers';\n\n\1",
    content
)

with open(path2, 'w') as f:
    f.write(content)
print(f'Fixed imports in {path2}')

# Rewrite PublicDashboard.jsx as a thin barrel
barrel = """import React from 'react';
import { useIsDesktop } from './public/helpers';
import DesktopPublicDashboard from './public/DesktopPublicDashboard';
import MobilePublicDashboard from './public/MobilePublicDashboard';

const PublicDashboard = () => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopPublicDashboard /> : <MobilePublicDashboard />;
};

export default PublicDashboard;
"""

with open('client/src/pages/PublicDashboard.jsx', 'w') as f:
    f.write(barrel)
print('Rewrote PublicDashboard.jsx as thin barrel')

print('\nAll done!')
