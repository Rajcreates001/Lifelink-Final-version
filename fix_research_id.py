"""Fix: Add id to ResearchSection, update CTA button scroll target"""
import os

filepath = os.path.join("client", "src", "pages", "LandingPage.jsx")
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add id="research" to ResearchSection
old = '<section ref={ref} className="py-20 sm:py-28">\n            <div className={`text-center mb-14 transition-all duration-700 ${entered'
new = '<section id="research" ref={ref} className="py-20 sm:py-28">\n            <div className={`text-center mb-14 transition-all duration-700 ${entered'
content = content.replace(old, new)

# 2. Update the View Research CTA button to scroll to #research
old_cta = "document.getElementById('features')?.scrollIntoView"
new_cta = "document.getElementById('research')?.scrollIntoView"
content = content.replace(old_cta, new_cta)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed: {len(content)} bytes written")
