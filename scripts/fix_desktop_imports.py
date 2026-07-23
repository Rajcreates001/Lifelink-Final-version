#!/usr/bin/env python
"""Fix DesktopPublicDashboard.jsx imports and exports"""
path = 'client/src/pages/public/DesktopPublicDashboard.jsx'

with open(path, 'r') as f:
    content = f.read()

# Add proper React and project imports at the top, after the helpers import
imports_to_add = """import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import DashboardLayout from '../../layout/DashboardLayout';
import { DashboardCard, ExplainabilityPanel, LoadingSpinner, SimpleLineChart, StatusPill } from '../../components/Common';
import HospitalMap from '../../components/HospitalMap';
import HealthRiskCalculator from '../../components/HealthRiskCalculator';
import MobileCard from '../../components/ui/MobileCard';
import mockHospitals from '../../data/mockHospitals';

"""

content = content.replace(
    "import { fallbackIncidents, SpeechRecognition } from './helpers';\n",
    "import { fallbackIncidents, SpeechRecognition } from './helpers';\n\n" + imports_to_add
)

# Fix the `mode` reference in the preload useEffect - remove from dependency array
content = content.replace(
    "  }, [mode, user?.id]);\n",
    "  }, [user?.id]);\n"
)

# Remove duplicate import lines that might have been added by the extraction
# Check for duplicate mockHospitals, useAuth, etc. imports
import re
# Remove duplicate import lines
lines = content.split('\n')
seen_imports = set()
cleaned_lines = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith('import '):
        # Only keep unique imports
        if stripped in seen_imports:
            continue
        seen_imports.add(stripped)
    cleaned_lines.append(line)

content = '\n'.join(cleaned_lines)

# Add export default at the end
content = content.rstrip() + '\n\nexport default DesktopPublicDashboard;\n'

with open(path, 'w') as f:
    f.write(content)

print(f'Fixed imports and exports in {path}')
