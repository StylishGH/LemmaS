import re

# Read the backup
with open(r'D:\dev\mathai-web\web\public\landing.html.bak', 'r', encoding='utf-8') as f:
    old = f.read()

# New style section
new_style = """
    :root[data-theme="chalkboard"] {
      --bg-surface: #121714;
      --bg-elevated: #1a1f1c;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
      --accent-primary: #facc15;
      --accent-primary-hover: #eab308;
      --accent-status-alert: #fb7185;
      --accent-status-success: #6ee7b7;
      --border-subtle: rgba(250, 204, 21, 0.15);
      --border-focus: #facc15;
      --shadow-glow: 0 0 30px rgba(250, 204, 21, 0.12);
      --hero-gradient: radial-gradient(ellipse at center, rgba(250, 204, 21, 0.08) 0%, transparent 70%);
      --card-glass: rgba(18, 23, 20, 0.92);
    }
    :root[data-theme="whiteboard"] {
      --bg-surface: #f8fafc;
      --bg-elevated: #ffffff;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --accent-primary: #2563eb;
      --accent-primary-hover: #1d4ed8;
      --accent-status-alert: #dc2626;
      --accent-status-success: #16a34a;
      --border-subtle: rgba(37, 99, 235, 0.12);
      --border-focus: #2563eb;
      --shadow-glow: 0 0 30px rgba(37, 99, 235, 0.1);
      --hero-gradient: radial-gradient(ellipse at center, rgba(37, 99, 235, 0.06) 0%, transparent 70%);
      --card-glass: rgba(255, 255, 255, 0.95);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Geist', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: var(--bg-surface);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    html { scroll-behavior: smooth; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
    .theme-toggle {
      position: fixed; top: 1.5rem; right: 1.5rem; z-index: 100;
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      border-radius: 50%; width: 48px; height: 48px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
      box-shadow: var(--shadow-glow);
    }
    .theme-toggle:hover { border-color: var(--accent-primary); transform: scale(1.05); }
    .theme-toggle:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
    .theme-toggle svg { width: 22px; height: 22px; stroke: var(--accent-primary); fill: none; }
    .theme-toggle .icon-whiteboard { display: none; }
    :root[data-theme="whiteboard"] .theme-toggle .icon-chalkboard { display: none; }
    :root[data-theme="whiteboard"] .theme-toggle .icon-whiteboard { display: block; }
    .hero { position: relative; width: 100%; height: 100vh; min-height: 650px; overflow: hidden; background: var(--hero-gradient); }
    .ken-burns { position: absolute; width: 100%; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; animation: ken-burns-zoom 20s ease-in-out infinite; will-change: transform; }
    .layer-1 { background-image: url(/images/board-blue.jpeg); z-index: 1; opacity: 0.55; filter: grayscale(40%) brightness(0.85); }
    .layer-2 { background-image: url(/images/board-green.jpeg); z-index: 2; opacity: 0.35; filter: grayscale(60%) brightness(0.75); animation-delay: 5s; animation-direction: reverse; }
    @keyframes ken-burns-zoom { 0% { transform: scale(1) translate(0); } 30% { transform: scale(1.12) translate(-4%, -4%); } 60% { transform: scale(1.2) translate(3%, 2%); } 80% { transform: scale(1.15) translate(-2%, 3%); } 100% { transform: scale(1) translate(0); } }
    @media (prefers-reduced-motion: reduce) { .ken-burns { animation: none; transform: scale(1.02); } @keyframes ken-burns-zoom { 0% { transform: scale(1.02); } 100% { transform: scale(1.05); } } }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, var(--bg-surface) 0%, transparent 40%, transparent 60%, var(--bg-surface) 100%); pointer-events: none; }
    .hero-content { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 2rem 3rem; max-width: 1200px; margin: 0 auto; text-align: left; }
    .logo-mark { width: 72px; height: 72px; margin-bottom: 1.5rem; filter: drop-shadow(0 0 20px var(--accent-primary)); }
    .logo-text { font-family: 'Outfit', sans-serif; font-size: clamp(3rem, 10vw, 5.5rem); font-weight: 700; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .tagline { font-size: clamp(1.125rem, 2.5vw, 1.5rem); color: var(--text-secondary); margin-bottom: 2.5rem; max-width: 680px; line-height: 1.7; font-weight: 400; }
    .cta-group { display: flex; flex-wrap: wrap; gap: 1rem; }
    .cta-btn { display: inline-flex; align-items: center; gap: 0.625rem; padding: 1rem 2rem; border-radius: 0.625rem; font-family: 'Geist', sans-serif; font-weight: 500; font-size: 1rem; text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease; min-width: 200px; justify-content: center; }
    .cta-btn-primary { background: var(--accent-primary); color: var(--bg-surface); border: none; box-shadow: var(--shadow-glow); }
    .cta-btn-primary:hover { background: var(--accent-primary-hover); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
    .cta-btn-secondary { background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border-subtle); }
    .cta-btn-secondary:hover { border-color: var(--accent-primary); background: var(--card-glass); }
    .features { padding: 7rem 2rem; max-width: 1200px; margin: 0 auto; }
    .section-header { text-align: center; margin-bottom: 4.5rem; }
    .section-header .label { display: inline-block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: var(--accent-primary); margin-bottom: 1rem; }
    .section-header h2 { font-family: 'Outfit', sans-serif; font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 1rem; }
    .section-header p { color: var(--text-secondary); font-size: 1.25rem; max-width: 720px; margin: 0 auto; line-height: 1.65; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .card { background: var(--card-glass); border: 1px solid var(--border-subtle); border-radius: 1rem; padding: 2.5rem 2rem; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
    .card:hover { transform: translateY(-6px); box-shadow: var(--shadow-glow); border-color: var(--accent-primary); }
    .card-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%); border-radius: 0.75rem; margin-bottom: 1.25rem; color: var(--bg-surface); font-size: 1.5rem; }
    .card h3 { font-family: 'Outfit', sans-serif; font-size: 1.375rem; font-weight: 600; margin-bottom: 0.75rem; line-height: 1.3; }
    .card p { color: var(--text-secondary); font-size: 1rem; line-height: 1.65; }
    .stats { padding: 5rem 2rem; background: var(--bg-elevated); border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto; text-align: center; }
    .stat-item { display: flex; flex-direction: column; gap: 0.5rem; }
    .stat-number { font-family: 'Outfit', sans-serif; font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 700; line-height: 1; background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .stat-label { color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
    .footer { padding: 3rem 2rem; background: var(--bg-elevated); border-top: 1px solid var(--border-subtle); }
    .footer-content { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1.5rem; }
    .footer-brand { display: flex; align-items: center; gap: 0.75rem; color: var(--text-secondary); font-size: 0.875rem; }
    .footer-brand svg { stroke: var(--accent-primary); }
    .footer-links { display: flex; gap: 2rem; }
    .footer-links a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; transition: color 0.15s ease; }
    .footer-links a:hover { color: var(--accent-primary); }
    .nav-indicators { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 20; }
    .nav-indicators span { width: 10px; height: 10px; border-radius: 50%; background: rgba(148, 163, 184, 0.4); border: 2px solid var(--accent-primary); cursor: pointer; transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease; opacity: 0.5; }
    .nav-indicators span.active { background: var(--accent-primary); transform: scale(1.25); opacity: 1; }
    @media (max-width: 768px) { .hero { min-height: 100vh; } .hero-content { padding: 1.5rem; text-align: center; } .cta-group { justify-content: center; } .cta-btn { width: 100%; min-width: auto; } .cta-btn-secondary { margin-left: 0; } .nav-indicators { bottom: 1.5rem; } .theme-toggle { top: 1rem; right: 1rem; width: 44px; height: 44px; } .features { padding: 5rem 1.5rem; } .stats { padding: 4rem 1.5rem; } .footer-content { flex-direction: column; text-align: center; } }
    @media (max-width: 480px) { .hero { min-height: auto; padding-top: 6rem; } .logo-text { font-size: 2.5rem; } .tagline { font-size: 1rem; } .section-header h2 { font-size: 2rem; } .stat-number { font-size: 2.5rem; } }
"""

# Find the style block
style_start = old.find('<style>')
style_end = old.find('</style>')

if style_start != -1 and style_end != -1:
    new_html = old[:style_start] + '<style>' + new_style + '</style>' + old[style_end + 8:]
else:
    new_html = old

# Replace MathAI with Lemmas
new_html = new_html.replace('MathAI', 'Lemmas').replace('mathai', 'lemmas')

# Update the title
new_html = new_html.replace('<title>Lemmas - Plataforma Cognitiva de Matematica', '<title>Lemmas - Plataforma de Aprendizado Matematico Adaptativo')

# Update the html tag to have data-theme
new_html = new_html.replace('<html lang="pt-BR">', '<html lang="pt-BR" data-theme="chalkboard">')

# Write back
with open(r'D:\dev\mathai-web\web\public\landing.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print('Done - style replaced and name updated')