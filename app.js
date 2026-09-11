/**
 * ashley_os desktop controller
 * gnome 50 shell runtime, libadwaita splitview & window management
 */

(() => {
    'use strict';

    // Top bar clock service
    const Clock = {
        element: document.getElementById('clock'),

        init() {
            if (!this.element) return;
            this.update();
            setInterval(() => this.update(), 1000);
        },

        update() {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            this.element.innerHTML = `<span>${dateStr}</span><span class="clock-time">${timeStr}</span>`;
        }
    };

    // AdwToast notification bus
    const Toast = {
        container: document.getElementById('toast-overlay'),
        timeoutId: null,

        show(message, duration = 2400) {
            if (!this.container) return;
            clearTimeout(this.timeoutId);

            this.container.textContent = message;
            this.container.classList.add('active');

            this.timeoutId = setTimeout(() => {
                this.container.classList.remove('active');
            }, duration);
        }
    };

    // Dynamic GNOME 50 workspace controller
    const Workspaces = {
        indicator: document.querySelector('.workspace-indicator'),
        dots: document.querySelectorAll('.workspace-dot'),
        current: 1,

        init() {
            if (!this.indicator) return;

            this.dots.forEach(dot => {
                dot.addEventListener('click', () => {
                    const wsIndex = parseInt(dot.getAttribute('data-workspace'), 10);
                    this.switchTo(wsIndex);
                });
            });

            // gnome 50 scroll-wheel workspace paging
            this.indicator.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY > 0 && this.current < this.dots.length) {
                    this.switchTo(this.current + 1);
                } else if (e.deltaY < 0 && this.current > 1) {
                    this.switchTo(this.current - 1);
                }
            }, { passive: false });
        },

        switchTo(index) {
            if (index === this.current) {
                if (WindowManager.windowEl.classList.contains('closed')) {
                    WindowManager.reopen();
                }
                return;
            }

            this.current = index;
            this.dots.forEach(dot => {
                const active = parseInt(dot.getAttribute('data-workspace'), 10) === index;
                dot.classList.toggle('active', active);
                if (active) dot.setAttribute('aria-current', 'page');
                else dot.removeAttribute('aria-current');
            });

            if (this.current === 1) {
                WindowManager.reopen();
            } else {
                WindowManager.minimizeSilent();
                Toast.show(`Switched to workspace ${index}`);
            }
        }
    };

    // Libadwaita accent color preset selector
    const Accent = {
        init() {
            const saved = localStorage.getItem('adw-accent') || 'blue';
            this.apply(saved);

            document.addEventListener('click', (e) => {
                const dot = e.target.closest('.accent-dot');
                if (!dot) return;
                const accent = dot.getAttribute('data-accent');
                if (accent) {
                    this.apply(accent);
                    Toast.show(`Accent color set to ${accent}`);
                }
            });
        },

        apply(accent) {
            document.body.setAttribute('data-accent', accent);
            localStorage.setItem('adw-accent', accent);
            document.querySelectorAll('.accent-dot').forEach(dot => {
                dot.classList.toggle('active', dot.getAttribute('data-accent') === accent);
            });
        }
    };

    // Live search filter for preferences rows
    const SearchFilter = {
        input: document.getElementById('telemetry-filter'),

        init() {
            if (!this.input) return;

            this.input.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const rows = document.querySelectorAll('.action-row, details.expander-row');

                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    const matches = !query || text.includes(query);
                    row.style.display = matches ? '' : 'none';

                    // auto-expand collapsed details when search matches so user doesnt scream
                    if (row.tagName === 'DETAILS' && query && matches) {
                        row.open = true;
                    }
                });
            });
        }
    };

    // Navigation and splitview switching
    const Navigation = {
        meta: {
            profile: { title: 'About Ashley', subtitle: 'Hardware & platform telemetry' },
            projects: { title: 'Repositories', subtitle: 'Published GitHub projects' },
            bugs: { title: 'Commit Ledger & Anomalies', subtitle: 'Runtime bugs and fixed regressions' }
        },
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('mobile-overlay'),
        headerTitle: document.getElementById('header-title'),
        headerSubtitle: document.getElementById('header-subtitle'),
        navItems: document.querySelectorAll('.nav-item'),
        pages: document.querySelectorAll('.content-page'),

        init() {
            document.addEventListener('click', (event) => {
                const navBtn = event.target.closest('[data-nav-target]');
                if (navBtn) {
                    const targetId = navBtn.getAttribute('data-nav-target');
                    this.showPage(targetId, navBtn);
                }

                if (event.target.closest('[data-action="toggle-sidebar"]')) {
                    this.toggleSidebar();
                }

                // Clipboard copy button
                const copyBtn = event.target.closest('.copy-btn');
                if (copyBtn) {
                    const val = copyBtn.getAttribute('data-copy');
                    if (val) {
                        navigator.clipboard.writeText(val).then(() => {
                            Toast.show(`Copied: "${val}"`);
                        }).catch(() => {
                            Toast.show('Failed to write clipboard');
                        });
                    }
                }

                // Quick settings capsule click
                if (event.target.closest('#quick-settings')) {
                    Toast.show('Performance mode · Wi-Fi active · 79% battery');
                }
            });
        },

        showPage(pageId, activeBtn) {
            const targetPage = document.getElementById(pageId);
            if (!targetPage) return;

            this.pages.forEach(page => page.classList.remove('active'));
            this.navItems.forEach(item => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });

            targetPage.classList.add('active');
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.setAttribute('aria-selected', 'true');
            } else {
                const matchingBtn = document.querySelector(`[data-nav-target="${pageId}"]`);
                if (matchingBtn) {
                    matchingBtn.classList.add('active');
                    matchingBtn.setAttribute('aria-selected', 'true');
                }
            }

            const info = this.meta[pageId];
            if (info) {
                if (this.headerTitle) this.headerTitle.textContent = info.title;
                if (this.headerSubtitle) this.headerSubtitle.textContent = info.subtitle;
            }

            if (window.innerWidth <= 768) {
                this.closeSidebar();
            }
        },

        toggleSidebar() {
            if (!this.sidebar) return;
            this.sidebar.classList.toggle('open');
            if (this.overlay) this.overlay.classList.toggle('active');
        },

        closeSidebar() {
            if (!this.sidebar) return;
            this.sidebar.classList.remove('open');
            if (this.overlay) this.overlay.classList.remove('active');
        }
    };

    // Window controller
    const WindowManager = {
        windowEl: document.getElementById('main-window'),
        header: document.getElementById('drag-handle'),
        isDragging: false,
        startX: 0,
        startY: 0,
        xOffset: 0,
        yOffset: 0,

        init() {
            if (!this.windowEl || !this.header) return;

            this.header.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            this.header.addEventListener('pointermove', (e) => this.onPointerMove(e));
            this.header.addEventListener('pointerup', (e) => this.onPointerUp(e));
            this.header.addEventListener('pointercancel', (e) => this.onPointerUp(e));

            document.addEventListener('click', (event) => {
                if (event.target.closest('[data-action="close-window"]')) {
                    this.close();
                }
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (Navigation.sidebar && Navigation.sidebar.classList.contains('open')) {
                        Navigation.closeSidebar();
                    }
                }
            });
        },

        onPointerDown(e) {
            if (window.innerWidth <= 768) return;
            if (e.target.closest('button') || e.target.closest('.control') || e.target.closest('a') || e.target.closest('input')) return;

            this.isDragging = true;
            this.startX = e.clientX - this.xOffset;
            this.startY = e.clientY - this.yOffset;
            document.body.classList.add('dragging');

            // pointer capture fixes random cursor drops during drags
            this.header.setPointerCapture(e.pointerId);
        },

        onPointerMove(e) {
            if (!this.isDragging) return;

            const currentX = e.clientX - this.startX;
            const currentY = e.clientY - this.startY;

            const maxX = Math.max(20, (window.innerWidth - this.windowEl.offsetWidth) / 2 + 100);
            const maxY = Math.max(20, (window.innerHeight - this.windowEl.offsetHeight) / 2 + 80);

            this.xOffset = Math.max(-maxX, Math.min(maxX, currentX));
            this.yOffset = Math.max(-maxY, Math.min(maxY, currentY));

            this.windowEl.style.animation = 'none';
            this.windowEl.style.transform = `translate(${this.xOffset}px, ${this.yOffset}px)`;
        },

        onPointerUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;
            document.body.classList.remove('dragging');
            if (this.header.hasPointerCapture(e.pointerId)) {
                this.header.releasePointerCapture(e.pointerId);
            }
        },

        close() {
            this.windowEl.classList.add('closed');
            Toast.show('Window closed · Click Workspace 1 to restore');
        },

        minimizeSilent() {
            this.windowEl.classList.add('closed');
        },

        reopen() {
            this.windowEl.classList.remove('closed');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        Clock.init();
        Toast.init?.();
        Workspaces.init();
        Accent.init();
        SearchFilter.init();
        Navigation.init();
        WindowManager.init();
    });
})();
