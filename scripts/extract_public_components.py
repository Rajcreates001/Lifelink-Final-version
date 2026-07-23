#!/usr/bin/env python
"""Extract DesktopPublicDashboard and MobilePublicDashboard from PublicDashboard.jsx"""
import re
import sys

src = 'client/src/pages/PublicDashboard.jsx'
dst_dir = 'client/src/pages/public'

with open(src, 'r') as f:
    lines = f.readlines()

# Find line numbers for each component (0-indexed)
# DesktopPublicDashboard starts at line 1024 (0-indexed: 1023)
# MobilePublicDashboard starts at line 2674 (0-indexed: 2673)
# PublicDashboard main component starts at line 3032 (0-indexed: 3031)

# DesktopPublicDashboard = lines 1023:2673 (0-indexed, exclusive end)
desktop_lines = lines[1023:2673]
# MobilePublicDashboard = lines 2673:3031 
mobile_lines = lines[2673:3031]

# Write DesktopPublicDashboard.jsx
desktop_path = f'{dst_dir}/DesktopPublicDashboard.jsx'
with open(desktop_path, 'w') as f:
    f.writelines(desktop_lines)
print(f'Written {len(desktop_lines)} lines to {desktop_path}')

# Write MobilePublicDashboard.jsx
mobile_path = f'{dst_dir}/MobilePublicDashboard.jsx'
with open(mobile_path, 'w') as f:
    f.writelines(mobile_lines)
print(f'Written {len(mobile_lines)} lines to {mobile_path}')

print('\nDone!')
