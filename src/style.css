/* === Design Tokens — Light Theme === */
:root {
    --bg: #f6f4f0;
    --bg-deep: #eae7e1;
    --bg-subtle: #f0ede7;
    --fg: #1a1a1a;
    --fg-secondary: #3a3a3a;
    --muted: #8a857e;
    --accent: #0a8f6c;
    --accent-bright: #0db87f;
    --accent-dim: #087a5c;
    --accent-glow: rgba(10, 143, 108, 0.1);
    --accent-glow-strong: rgba(10, 143, 108, 0.2);
    --accent-surface: #e6f5ef;
    --card: #ffffff;
    --card-border: #e5e1da;
    --card-shadow: 0 2px 16px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.08);
    --card-shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1);
    --danger: #dc2626;
    --danger-surface: #fef2f2;
    --danger-border: #fecaca;
    --warning: #d97706;
    --radius: 16px;
    --radius-sm: 10px;
    --font-ui: 'Space Grotesk', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
}

/* === Reset & Base === */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html { scroll-behavior: smooth; }

body {
    font-family: var(--font-ui);
    background: var(--bg);
    color: var(--fg);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}

/* === Background Canvas === */
#bgCanvas {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 0;
    pointer-events: none;
}

/* === Subtle Grid Pattern === */
.bg-pattern {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 0;
    pointer-events: none;
    background-image:
        radial-gradient(circle at 1px 1px, rgba(10, 143, 108, 0.04) 1px, transparent 0);
    background-size: 32px 32px;
}

/* === Soft Orbs === */
.orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(100px);
    z-index: 0;
    pointer-events: none;
    animation: orbFloat 14s ease-in-out infinite;
}

.orb-1 {
    width: 500px; height: 500px;
    background: rgba(10, 143, 108, 0.06);
    top: -150px; right: -150px;
}

.orb-2 {
    width: 400px; height: 400px;
    background: rgba(13, 184, 127, 0.04);
    bottom: -100px; left: -120px;
    animation-delay: -5s;
}

.orb-3 {
    width: 250px; height: 250px;
    background: rgba(10, 143, 108, 0.05);
    top: 40%; left: 60%;
    animation-delay: -9s;
}

@keyframes orbFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(25px, -18px) scale(1.04); }
    66% { transform: translate(-18px, 12px) scale(0.96); }
}

/* === Container === */
.container {
    position: relative;
    z-index: 2;
    max-width: 640px;
    margin: 0 auto;
    padding: 40px 20px 60px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* === Header === */
header {
    text-align: center;
    margin-bottom: 48px;
    padding-top: 20px;
}

.shield-icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 88px; height: 88px;
    margin-bottom: 24px;
}

.shield-icon::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent-glow-strong), transparent 70%);
    animation: shieldPulse 3s ease-in-out infinite;
}

.shield-icon i {
    font-size: 38px;
    color: var(--accent);
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 8px var(--accent-glow-strong));
    animation: shieldBounce 4s ease-in-out infinite;
}

@keyframes shieldPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 1; }
}

@keyframes shieldBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
}

header h1 {
    font-size: clamp(1.8rem, 5vw, 2.4rem);
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 10px;
    color: var(--fg);
}

header h1 span {
    color: var(--accent);
}

header p {
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.6;
    max-width: 400px;
    margin: 0 auto;
}

/* === Card === */
.glass-card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 32px;
    box-shadow: var(--card-shadow);
    transition: box-shadow 0.4s ease, border-color 0.4s ease;
}

.glass-card:hover {
    box-shadow: var(--card-shadow-hover);
    border-color: #d8d4cc;
}

/* === Upload Zone === */
.upload-zone {
    position: relative;
    border: 2px dashed var(--card-border);
    border-radius: var(--radius);
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.4s ease;
    background: var(--bg-subtle);
    overflow: hidden;
}

.upload-zone::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, var(--accent-glow), transparent 60%);
    opacity: 0;
    transition: opacity 0.4s ease;
}

.upload-zone:hover,
.upload-zone.drag-over {
    border-color: var(--accent);
    background: var(--accent-surface);
}

.upload-zone:hover::before,
.upload-zone.drag-over::before {
    opacity: 1;
}

.upload-icon {
    position: relative;
    z-index: 1;
    width: 64px; height: 64px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--accent-surface);
    border: 1px solid rgba(10, 143, 108, 0.15);
    transition: all 0.3s ease;
}

.upload-zone:hover .upload-icon {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px var(--accent-glow-strong);
}

.upload-icon i {
    font-size: 24px;
    color: var(--accent);
}

.upload-text {
    position: relative;
    z-index: 1;
}

.upload-text .main-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--fg);
    margin-bottom: 6px;
}

.upload-text .main-text span {
    color: var(--accent);
}

.upload-text .sub-text {
    font-size: 0.8rem;
    color: var(--muted);
}

.upload-text .sub-text .accent {
    color: var(--accent-dim);
    text-decoration: underline;
    text-underline-offset: 2px;
}

#fileName {
    position: relative;
    z-index: 1;
    margin-top: 14px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
    padding: 8px 14px;
    background: var(--bg-subtle);
    border-radius: var(--radius-sm);
    display: inline-block;
    transition: all 0.3s ease;
    word-break: break-all;
    border: 1px solid transparent;
}

#fileName.has-file {
    color: var(--accent-dim);
    background: var(--accent-surface);
    border-color: rgba(10, 143, 108, 0.15);
}

input[type="file"] { display: none; }

/* === Feature Badges === */
.features-row {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;
}

.badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 500;
    background: var(--accent-surface);
    border: 1px solid rgba(10, 143, 108, 0.12);
    color: var(--muted);
    transition: all 0.3s ease;
}

.badge:hover {
    color: var(--accent);
    border-color: rgba(10, 143, 108, 0.25);
}

.badge i {
    font-size: 0.68rem;
    color: var(--accent);
}

/* === Preview Section === */
.hidden { display: none !important; }

#previewContainer {
    margin-top: 24px;
    animation: fadeSlideUp 0.5s ease forwards;
}

@keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
}

.preview-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 14px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
}

.preview-label .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
}

.image-frame {
    position: relative;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--card-border);
    background: var(--bg-deep);
}

.image-frame::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0.7;
    z-index: 2;
}

.image-frame img {
    display: block;
    width: 100%;
    max-height: 400px;
    object-fit: contain;
    background: var(--bg-deep);
}

.image-frame::after {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid rgba(10, 143, 108, 0.12);
    border-radius: 4px;
    pointer-events: none;
}

.corner-mark {
    position: absolute;
    width: 12px; height: 12px;
    border-color: var(--accent);
    border-style: solid;
    z-index: 1;
}

.corner-mark.tl { top: 4px; left: 4px; border-width: 2px 0 0 2px; }
.corner-mark.tr { top: 4px; right: 4px; border-width: 2px 2px 0 0; }
.corner-mark.bl { bottom: 4px; left: 4px; border-width: 0 0 2px 2px; }
.corner-mark.br { bottom: 4px; right: 4px; border-width: 0 2px 2px 0; }

/* === EXIF Warning Strip === */
.exif-strip {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    margin-top: 12px;
    border-radius: var(--radius-sm);
    background: var(--danger-surface);
    border: 1px solid var(--danger-border);
    font-size: 0.78rem;
    animation: fadeSlideUp 0.5s ease 0.15s both;
}

.exif-strip i {
    color: var(--danger);
    font-size: 0.9rem;
}

.exif-strip .exif-text {
    color: var(--danger);
    font-weight: 500;
}

.exif-strip .exif-detail {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    margin-left: auto;
}

/* === Buttons === */
.btn-row {
    display: flex;
    gap: 12px;
    margin-top: 20px;
}

.primary-btn {
    flex: 1;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 28px;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    color: #ffffff;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-bright) 100%);
    box-shadow: 0 4px 16px rgba(10, 143, 108, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all 0.3s ease;
    overflow: hidden;
}

.primary-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.18), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
}

.primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(10, 143, 108, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.primary-btn:hover::before {
    transform: translateX(100%);
}

.primary-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(10, 143, 108, 0.25);
}

.primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
}

.secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    border: 1px solid var(--card-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--muted);
    background: var(--bg-subtle);
    transition: all 0.3s ease;
}

.secondary-btn:hover {
    border-color: var(--danger-border);
    color: var(--danger);
    background: var(--danger-surface);
}

/* Processing */
.primary-btn.processing { pointer-events: none; }
.primary-btn.processing .btn-text { opacity: 0; }
.primary-btn.processing .btn-loader { display: block; }

.btn-loader {
    display: none;
    position: absolute;
    width: 22px; height: 22px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* === Result Section === */
#resultSection {
    margin-top: 24px;
    animation: fadeSlideUp 0.6s ease forwards;
}

.result-card {
    position: relative;
    padding: 32px;
    text-align: center;
    overflow: hidden;
}

.result-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, var(--accent-glow), transparent 60%);
    pointer-events: none;
}

.success-icon {
    width: 64px; height: 64px;
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--accent-surface);
    border: 2px solid rgba(10, 143, 108, 0.2);
    animation: successPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes successPop {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.success-icon i {
    font-size: 28px;
    color: var(--accent);
}

.success-msg {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--fg);
    margin-bottom: 6px;
}

.success-sub {
    font-size: 0.85rem;
    color: var(--muted);
    margin-bottom: 24px;
    line-height: 1.6;
}

.download-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 32px;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    color: #ffffff;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-bright) 100%);
    text-decoration: none;
    box-shadow: 0 4px 16px rgba(10, 143, 108, 0.3);
    transition: all 0.3s ease;
}

.download-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(10, 143, 108, 0.4);
}

.download-btn:active { transform: translateY(0); }

/* Clean Stats */
.clean-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
}

.stat-item {
    padding: 14px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-subtle);
    border: 1px solid var(--card-border);
}

.stat-value {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 2px;
}

.stat-label {
    font-size: 0.68rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* === Toast === */
.toast-container {
    position: fixed;
    top: 24px; right: 24px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    border-radius: var(--radius-sm);
    background: var(--card);
    border: 1px solid var(--card-border);
    font-size: 0.84rem;
    color: var(--fg);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    animation: toastIn 0.4s ease forwards;
    max-width: 340px;
}

.toast.toast-out { animation: toastOut 0.3s ease forwards; }
.toast.toast-error { border-color: var(--danger-border); }
.toast.toast-error i { color: var(--danger); }
.toast.toast-success { border-color: rgba(10, 143, 108, 0.25); }
.toast.toast-success i { color: var(--accent); }

@keyframes toastIn {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes toastOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(40px); }
}

/* === Footer === */
footer {
    margin-top: auto;
    padding-top: 48px;
    text-align: center;
}

.footer-line {
    width: 40px; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    margin: 0 auto 16px;
    opacity: 0.3;
}

footer p {
    font-size: 0.78rem;
    color: var(--muted);
    letter-spacing: 0.3px;
}

footer p span { color: var(--accent); font-weight: 600; }

/* === How It Works === */
.how-section { margin-top: 32px; }

.how-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 16px;
    text-align: center;
}

.how-steps {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.how-step {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px 0;
    position: relative;
}

.how-step:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 15px; top: 42px; bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom, var(--card-border), transparent);
}

.step-num {
    width: 30px; height: 30px; min-width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--accent-surface);
    border: 1px solid rgba(10, 143, 108, 0.15);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--accent);
}

.step-content h4 {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--fg);
    margin-bottom: 3px;
}

.step-content p {
    font-size: 0.78rem;
    color: var(--muted);
    line-height: 1.5;
}

/* === Responsive === */
@media (max-width: 480px) {
    .container { padding: 24px 16px 40px; }
    .glass-card { padding: 24px 18px; }
    .upload-zone { padding: 36px 16px; }
    .clean-stats { grid-template-columns: 1fr; gap: 8px; }
    .btn-row { flex-direction: column; }
    .features-row { gap: 6px; }
}

/* === Reduced Motion === */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
