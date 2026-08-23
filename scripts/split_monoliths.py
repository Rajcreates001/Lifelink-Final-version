#!/usr/bin/env python3
"""
Split 6 monolithic React component files into smaller, manageable modules.
"""
import re
import os

CLIENT_SRC = os.path.join(os.path.dirname(__file__), '..', 'client', 'src')


def split_landing_page():
    """Split LandingPage.jsx into individual component files."""
    src = os.path.join(CLIENT_SRC, 'pages', 'LandingPage.jsx')
    out_dir = os.path.join(CLIENT_SRC, 'pages', 'landingPage')
    os.makedirs(out_dir, exist_ok=True)

    with open(src, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    content = ''.join(lines)

    # Find all top-level component/function definitions
    component_pattern = re.compile(r'^(const (\w+) = |function (\w+)\()', re.MULTILINE)
    matches = list(component_pattern.finditer(content))

    # Build a map of name -> (start_line, start_pos)
    components = []
    for m in matches:
        name = m.group(2) or m.group(3)
        # Find which line this is on
        line_num = content[:m.start()].count('\n')
        components.append((name, m.start(), line_num))

    # Read imports (everything before the first component/hook)
    first_component_pos = components[0][1] if components else len(content)
    imports_block = content[:first_component_pos].strip()

    # For each component, extract until the next one
    for i, (name, start, line_num) in enumerate(components):
        if name in ('LandingPage',):  # Keep main component in original file
            continue

        # Find end position (next component start or end of file)
        if i + 1 < len(components):
            end = components[i + 1][1]
        else:
            # Find the last component definition
            end = len(content)

        # Clean up: find the last blank line before next component
        extracted = content[start:end].rstrip() + '\n'

        # Determine needed imports for this component
        needed_imports = []

        # React hooks used
        hooks_used = set()
        for hook in ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo']:
            if hook in extracted:
                hooks_used.add(hook)
        if hooks_used:
            needed_imports.append(f"import React, {{ {', '.join(sorted(hooks_used))} }} from 'react';")
        else:
            needed_imports.append("import React from 'react';")

        # Check for useNavigate
        if 'useNavigate' in extracted:
            needed_imports.append("import { useNavigate } from 'react-router-dom';")

        # Check for useAuth
        if 'useAuth' in extracted:
            needed_imports.append("import { useAuth } from '../../context/AuthContext';")

        # Check for useScrollIn / useCountUp (from hooks.js)
        hooks_from_local = []
        if 'useScrollIn' in extracted:
            hooks_from_local.append('useScrollIn')
        if 'useCountUp' in extracted:
            hooks_from_local.append('useCountUp')
        if hooks_from_local:
            needed_imports.append(f"import {{ {', '.join(hooks_from_local)} }} from './hooks';")

        # Check for constants used
        constants_used = []
        for const in ['ROLES', 'EMERGENCY_FEED', 'FEATURES', 'AI_CAPABILITIES', 'TECH_STACK', 'TIMELINE_STEPS', 'RESEARCH']:
            if const in extracted:
                constants_used.append(const)
        if constants_used:
            needed_imports.append(f"import {{ {', '.join(constants_used)} }} from './constants';")

        # Check for ResearchPaperModal
        if 'ResearchPaperModal' in extracted:
            needed_imports.append("import ResearchPaperModal from '../../components/ResearchPaperModal';")

        # Check for createPortal
        if 'createPortal' in extracted:
            needed_imports.append("import { createPortal } from 'react-dom';")

        # Build the file
        file_content = '\n'.join(needed_imports) + '\n\n' + extracted

        # Write file
        filename = f"{name}.jsx"
        filepath = os.path.join(out_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_content)
        print(f"  Created: landingPage/{filename} ({len(extracted.splitlines())} lines)")

    # Create index.js that re-exports all components
    index_lines = []
    for name, _, _ in components:
        if name == 'useCountUp':
            index_lines.append(f"export {{ {name} }} from './hooks';")
        elif name == 'useScrollIn':
            index_lines.append(f"export {{ {name} }} from './hooks';")
        elif name in ('ROLES', 'EMERGENCY_FEED', 'FEATURES', 'AI_CAPABILITIES', 'TECH_STACK', 'TIMELINE_STEPS', 'RESEARCH'):
            index_lines.append(f"export {{ {name} }} from './constants';")
        else:
            index_lines.append(f"export {{ default as {name} }} from './{name}';")

    index_path = os.path.join(out_dir, 'index.js')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(index_lines) + '\n')
    print(f"  Created: landingPage/index.js")

    # Update the original LandingPage.jsx to import from the split directory
    new_main = imports_block.replace(
        "import ResearchPaperModal from '../components/ResearchPaperModal';",
        "import {\n    NavBar, HeroSection, SafetySection, LiveStatsBar, EmergencyFeed,\n    FeaturesSection, PortalSection, AiShowcase, ImpactShowcase, Architecture,\n    EmergencyTimeline, WhyLifeLink, MLModelsSection, ResearchSection,\n    AppStrengthsSection, Partners, CTASection, TechStack, Footer,\n} from './landingPage';\nimport ResearchPaperModal from '../components/ResearchPaperModal';"
    )

    # Remove all extracted component definitions from the main file
    # Keep only the main LandingPage component
    main_start = content.find('const LandingPage = ')
    if main_start == -1:
        main_start = content.find('const LandingPage =', content.find('Footer'))

    new_main_content = new_main + '\n\n' + content[main_start:]

    with open(src, 'w', encoding='utf-8') as f:
        f.write(new_main_content)
    print(f"  Updated: pages/LandingPage.jsx (main orchestrator only)")


def split_file_by_exports(src_path, out_dir, prefix=''):
    """Split a file with multiple exported components into individual files."""
    with open(src_path, 'r', encoding='utf-8') as f:
        content = f.read()

    os.makedirs(out_dir, exist_ok=True)

    # Find all exported const components
    export_pattern = re.compile(r'^export const (\w+) = ', re.MULTILINE)
    matches = list(export_pattern.finditer(content))

    if not matches:
        print(f"  No exports found in {src_path}")
        return

    # Read imports
    first_export_pos = matches[0].start()
    imports_block = content[:first_export_pos].strip()

    for i, m in enumerate(matches):
        name = m.group(1)
        start = m.start()

        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(content)

        extracted = content[start:end].rstrip() + '\n'

        # Build imports
        needed = []
        # Check what's used
        if 'useState' in extracted:
            needed.append("import React, { useState } from 'react';")
        elif 'useEffect' in extracted:
            needed.append("import React, { useEffect } from 'react';")
        elif 'useCallback' in extracted:
            needed.append("import React, { useCallback } from 'react';")
        else:
            needed.append("import React from 'react';")

        if 'useNavigate' in extracted:
            needed.append("import { useNavigate } from 'react-router-dom';")

        # Check for local helper imports needed from the original
        helpers_used = []
        for helper in ['buildQuery', '_toInt', '_nowLabel', 'severityColor', 'impactColor',
                        'formatNumber', 'buildSeverityData', 'normalizeFeed', 'normalizeHospitals',
                        'pickCenter', 'buildSimulationGraph', 'severityScore', 'buildDisasterGraph',
                        'DEMO_DATA', 'ambulanceIcon', 'incidentIcon', 'hospitalIcon',
                        'DEFAULT_CENTER', 'BENGALURU_BOUNDS', 'resolveAmbulanceId',
                        'toLatLng', 'hasCoords', 'isWithinBengaluru', 'coerceToBengaluru',
                        'buildFallbackRoute', 'trafficLevelFromRatio', 'haversineKm', 'buildRouteInfo']:
            if helper in extracted:
                helpers_used.append(helper)

        if helpers_used:
            needed.append(f"import {{ {', '.join(helpers_used)} }} from './helpers';")

        file_content = '\n'.join(needed) + '\n\n' + extracted

        filename = f"{name}.jsx"
        filepath = os.path.join(out_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_content)
        print(f"  Created: {prefix}{filename} ({len(extracted.splitlines())} lines)")

    # Create helpers file with shared utilities
    _extract_helpers(src_path, out_dir, content, matches, imports_block)

    # Create index.js
    index_lines = [f"export {{ default as {m.group(1)} }} from './{m.group(1)}';" for m in matches]
    index_lines.insert(0, "export * from './helpers';")
    index_path = os.path.join(out_dir, 'index.js')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(index_lines) + '\n')


def _extract_helpers(src_path, out_dir, content, matches, imports_block):
    """Extract shared helper functions/constants from a monolithic file."""
    # Find all const/function definitions that are NOT exported components
    helper_pattern = re.compile(r'^(?:const (\w+) = |function (\w+)\()', re.MULTILINE)
    first_export = matches[0].start() if matches else len(content)

    helpers = []
    for m in helper_pattern.finditer(content[:first_export]):
        name = m.group(1) or m.group(2)
        if name and name[0].isupper():  # Skip uppercase constants (they're data)
            continue
        helpers.append((name, m.start()))

    # Also include uppercase constants defined before exports
    const_pattern = re.compile(r'^const (\w+) = ', re.MULTILINE)
    for m in const_pattern.finditer(content[:first_export]):
        name = m.group(1)
        if name[0].isupper():
            # Get the value
            start = m.start()
            # Find the next const or export
            next_match = const_pattern.search(content, m.end())
            if next_match:
                end = next_match.start()
            else:
                end = first_export
            value = content[start:end].strip()
            helpers.append((name, start, value))

    if not helpers:
        return

    # Build helpers file
    helper_lines = []
    for item in helpers:
        if len(item) == 3:  # (name, start, value)
            helper_lines.append(item[2])
        else:
            name, start = item
            # Find the function body
            next_def = re.search(r'^(?:const \w+ = |function \w+\()', content[start+10:], re.MULTILINE)
            if next_def:
                end = start + 10 + next_def.start()
            else:
                end = first_export
            helper_lines.append(content[start:end].strip())

    if helper_lines:
        helpers_path = os.path.join(out_dir, 'helpers.js')
        with open(helpers_path, 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(helper_lines) + '\n')
        print(f"  Created: helpers.js ({len(helper_lines)} exports)")


def split_hospital_ops():
    """Split HospitalOpsModules.jsx into individual files."""
    src = os.path.join(CLIENT_SRC, 'components', 'HospitalOpsModules.jsx')
    out_dir = os.path.join(CLIENT_SRC, 'components', 'hospitalOps')
    split_file_by_exports(src, out_dir, 'hospitalOps/')
    print(f"  Updated: HospitalOpsModules.jsx -> index.js barrel")


def split_gov_command():
    """Split GovernmentCommandModules.jsx into individual files."""
    src = os.path.join(CLIENT_SRC, 'components', 'GovernmentCommandModules.jsx')
    out_dir = os.path.join(CLIENT_SRC, 'components', 'govCommand')
    split_file_by_exports(src, out_dir, 'govCommand/')


def split_ambulance_mission():
    """Split AmbulanceMissionControl.jsx into individual files."""
    src = os.path.join(CLIENT_SRC, 'components', 'ui', 'AmbulanceMissionControl.jsx')
    out_dir = os.path.join(CLIENT_SRC, 'components', 'ambulanceMission')
    split_file_by_exports(src, out_dir, 'ambulanceMission/')


def split_single_component(src_path, out_dir, component_name, prefix=''):
    """Split a single large component into sub-components."""
    with open(src_path, 'r', encoding='utf-8') as f:
        content = f.read()

    os.makedirs(out_dir, exist_ok=True)

    # Find the main component function
    pattern = r'^(?:const|function) ' + component_name + r'\s*[=({]'
    main_match = re.search(pattern, content, re.MULTILINE)
    if not main_match:
        print(f"  Could not find {component_name} in {src_path}")
        return

    # Extract imports
    imports = content[:main_match.start()].strip()

    # Find all inner const/function definitions
    inner_pattern = re.compile(r'^(?:const (\w+) = |function (\w+)\()', re.MULTILINE)
    inners = []
    for m in inner_pattern.finditer(content[main_match.start():]):
        name = m.group(1) or m.group(2)
        if name and name != component_name and name[0].isupper():
            start = main_match.start() + m.start()
            inners.append((name, start))

    if not inners:
        print(f"  No inner components found in {component_name}")
        return

    for i, (name, start) in enumerate(inners):
        if i + 1 < len(inners):
            end = inners[i + 1][1]
        else:
            end = content.find(component_name, main_match.end())
            if end == -1:
                end = len(content)

        extracted = content[start:end].rstrip() + '\n'

        needed = []
        if 'useState' in extracted or 'useEffect' in extracted:
            needed.append(f"import React, {{ {', '.join(h for h in ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'] if h in extracted)} }} from 'react';")
        else:
            needed.append("import React from 'react';")

        if 'useNavigate' in extracted:
            needed.append("import { useNavigate } from 'react-router-dom';")

        file_content = '\n'.join(needed) + '\n\n' + extracted

        filepath = os.path.join(out_dir, f"{name}.jsx")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_content)
        print(f"  Created: {prefix}{name}.jsx ({len(extracted.splitlines())} lines)")


if __name__ == '__main__':
    print('='*60)
    print('LifeLink Monolith Splitter')
    print('='*60)

    print('\n1. LandingPage.jsx (3,639 lines) -> landingPage/')
    split_landing_page()

    print('\n2. HospitalOpsModules.jsx (3,355 lines) -> hospitalOps/')
    split_hospital_ops()

    print('\n3. GovernmentCommandModules.jsx (2,181 lines) -> govCommand/')
    split_gov_command()

    print('\n4. AmbulanceMissionControl.jsx (1,053 lines) -> ambulanceMission/')
    split_ambulance_mission()

    print('\nDone!')
