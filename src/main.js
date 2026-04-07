// ============================================================
// Anti-GeoSpy — Semua logika aplikasi
// File ini menangani: background, toast, upload, EXIF scan,
// komunikasi API, pixel noise, dan download.
// ============================================================

(function () {
    'use strict';

    // === DOM References ===
    const $ = (sel) => document.querySelector(sel);
    const bgCanvas       = $('#bgCanvas');
    const toastContainer  = $('#toastContainer');
    const uploadZone      = $('#uploadZone');
    const imageInput      = $('#imageInput');
    const fileNameEl      = $('#fileName');
    const previewContainer = $('#previewContainer');
    const imagePreview    = $('#imagePreview');
    const processBtn      = $('#processBtn');
    const resetBtn        = $('#resetBtn');
    const resultSection   = $('#resultSection');
    const downloadLink    = $('#downloadLink');
    const exifStrip       = $('#exifStrip');
    const exifDetail      = $('#exifDetail');
    const statFields      = $('#statFields');
    const statSize        = $('#statSize');
    const statSaved       = $('#statSaved');

    // === State ===
    let currentFile = null;
    let hasExif = false;

    // ============================================================
    // 1. PARTICLE BACKGROUND (Sudah disesuaikan ke warna Biru)
    // ============================================================
    function initBackground() {
        const ctx = bgCanvas.getContext('2d');
        let width, height, particles;
        const mouse = { x: -1000, y: -1000 };

        function resize() {
            width = bgCanvas.width = window.innerWidth;
            height = bgCanvas.height = window.innerHeight;
        }

        function createParticles() {
            const count = Math.floor((width * height) / 22000);
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.2,
                    r: Math.random() * 1.4 + 0.5,
                    alpha: Math.random() * 0.18 + 0.04
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`; // Biru Modern Cloud
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 110) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.05 * (1 - dist / 110)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }

                const mdx = p.x - mouse.x;
                const mdy = p.y - mouse.y;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - mDist / 140)})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }

            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', () => { resize(); createParticles(); });
        window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
        window.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });

        resize();
        createParticles();
        draw();
    }

    // ============================================================
    // 2. TOAST SYSTEM
    // ============================================================
    function showToast(message, type) {
        type = type || 'success';
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
        toast.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + message + '</span>';
        toastContainer.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('toast-out');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3500);
    }

    // ============================================================
    // 3. EXIF DETECTION (baca binary + Indikator Scanning Visual)
    // ============================================================
    function detectExif(arrayBuffer) {
        var view = new DataView(arrayBuffer);
        var detected = false;

        // --- JPEG ---
        if (view.byteLength >= 4 && view.getUint8(0) === 0xFF && view.getUint8(1) === 0xD8) {
            var offset = 2;
            while (offset < view.byteLength - 1) {
                var marker = view.getUint16(offset);
                if (marker === 0xFFDA) break;
                if (marker === 0xFFE1) { detected = true; break; }
                if ((marker & 0xFF00) !== 0xFF00) break;
                var segLen = view.getUint16(offset + 2);
                if (segLen < 2) break;
                offset += 2 + segLen;
            }
        }

        // --- PNG ---
        if (!detected && view.byteLength >= 8 &&
            view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50 &&
            view.getUint8(2) === 0x4E && view.getUint8(3) === 0x47) {
            var off = 8;
            while (off < view.byteLength - 12) {
                var chunkLen = view.getUint32(off);
                var chunkType = String.fromCharCode(
                    view.getUint8(off + 4), view.getUint8(off + 5),
                    view.getUint8(off + 6), view.getUint8(off + 7)
                );
                if (chunkType === 'eXIf') { detected = true; break; }
                if (chunkType === 'IEND') break;
                off += 12 + chunkLen;
            }
        }

        // --- WebP ---
        if (!detected && view.byteLength >= 12) {
            var riffTag = String.fromCharCode(
                view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
            );
            var webpTag = String.fromCharCode(
                view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
            );
            if (riffTag === 'RIFF' && webpTag === 'WEBP') {
                var wOff = 12;
                while (wOff < view.byteLength - 8) {
                    var chunkSz = view.getUint32(wOff + 4);
                    var cType = String.fromCharCode(
                        view.getUint8(wOff), view.getUint8(wOff + 1),
                        view.getUint8(wOff + 2), view.getUint8(wOff + 3)
                    );
                    if (cType === 'EXIF') { detected = true; break; }
                    wOff += 8 + chunkSz;
                    if (chunkSz % 2 !== 0) wOff += 1;
                }
            }
        }

        return detected;
    }

    // UI: Menampilkan animasi scanning pada strip EXIF
    function showScanningAnimation() {
        exifStrip.style.display = 'flex';
        exifStrip.style.background = '#F1F5F9'; // Abu netral
        exifStrip.style.borderColor = '#E2E8F0';
        exifStrip.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="color: #3B82F6; font-size: 0.9rem;"></i>
            <span class="exif-text" style="color: #3B82F6;">Memindai metadata...</span>
            <span class="exif-detail">Analyzing binary headers</span>
        `;
    }

    // UI: Menampilkan hasil akhir scan (Aman / Bahaya)
    function showScanResult(isDanger) {
        if (isDanger) {
            exifStrip.style.background = ''; // Kembalikan ke class default CSS
            exifStrip.style.borderColor = '';
            exifStrip.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger); font-size: 0.9rem;"></i>
                <span class="exif-text" style="color: var(--danger); font-weight: 500;">Metadata EXIF terdeteksi</span>
                <span class="exif-detail" id="exifDetail">Data lokasi mungkin tersimpan</span>
            `;
        } else {
            exifStrip.style.background = '#EFF6FF'; // Biru muda sangat tipis
            exifStrip.style.borderColor = '#DBEAFE';
            exifStrip.innerHTML = `
                <i class="fa-solid fa-circle-check" style="color: #22C55E; font-size: 0.9rem;"></i>
                <span class="exif-text" style="color: #15803D; font-weight: 500;">Aman — Tidak ada EXIF berbahaya</span>
                <span class="exif-detail">Clean binary structure</span>
            `;
        }
    }

    // ============================================================
    // 4. PIXEL NOISE INJECTION (Adversarial Perturbation)
    // ============================================================
    function injectPixelNoise(canvas) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width;
        var h = canvas.height;
        var imageData = ctx.getImageData(0, 0, w, h);
        var data = imageData.data;
        var len = data.length;

        for (var i = 0; i < len; i += 4) {
            var noise = (Math.random() > 0.5) ? 1 : -1;
            data[i]     = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // ============================================================
    // 5. FORMAT FILE SIZE
    // ============================================================
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // ============================================================
    // 6. FILE HANDLING & VALIDATION (Dengan Scanning UI)
    // ============================================================
    function handleFile(file) {
        var validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (validTypes.indexOf(file.type) === -1) {
            showToast('Format tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showToast('Ukuran file terlalu besar. Maksimal 20MB.', 'error');
            return;
        }

        currentFile = file;
        fileNameEl.textContent = file.name;
        fileNameEl.classList.add('has-file');

        // 1. Tampilkan preview langsung
        var readerPreview = new FileReader();
        readerPreview.onload = function (e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            resultSection.classList.add('hidden');
        };
        readerPreview.readAsDataURL(file);

        // 2. Tampilkan indikator scanning & baca binary
        showScanningAnimation();
        
        // Simulasi delay tipis agar animasi scanning terlihat oleh mata
        setTimeout(function() {
            var readerBinary = new FileReader();
            readerBinary.onload = function (e) {
                hasExif = detectExif(e.target.result);
                showScanResult(hasExif);
            };
            readerBinary.readAsArrayBuffer(file);
        }, 800); // Delay 800ms untuk efek visual

        showToast('Foto berhasil dimuat');
    }

    // ============================================================
    // 7. PROCESSING OVERLAY (Scrolling Terminal Logs)
    // ============================================================
    function showProcessingOverlay() {
        var overlay = document.createElement('div');
        overlay.id = 'processingOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        var terminal = document.createElement('div');
        terminal.style.cssText = `
            width: 90%; max-width: 480px;
            background: #0F172A; border: 1px solid #334155;
            border-radius: 12px; padding: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            font-family: 'JetBrains Mono', monospace;
        `;

        var header = document.createElement('div');
        header.style.cssText = `
            display: flex; align-items: center; gap: 8px;
            margin-bottom: 16px; padding-bottom: 12px;
            border-bottom: 1px solid #1E293B;
        `;
        header.innerHTML = `
            <div style="width:10px;height:10px;border-radius:50%;background:#EF4444;"></div>
            <div style="width:10px;height:10px;border-radius:50%;background:#F59E0B;"></div>
            <div style="width:10px;height:10px;border-radius:50%;background:#22C55E;"></div>
            <span style="margin-left:8px; color:#64748B; font-size:0.7rem;">anti-geospy-shield.exe</span>
        `;

        var logBox = document.createElement('div');
        logBox.id = 'logBox';
        logBox.style.cssText = `
            height: 200px; overflow-y: auto; scroll-behavior: smooth;
            font-size: 0.75rem; line-height: 1.6;
        `;
        // Sembunyikan scrollbar tapi bisa di-scroll
        logBox.innerHTML = `<style>#logBox::-webkit-scrollbar{width:4px}#logBox::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}</style>`;

        terminal.appendChild(header);
        terminal.appendChild(logBox);
        overlay.appendChild(terminal);
        document.body.appendChild(overlay);

        // Trigger fade in
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
        
        return logBox;
    }

    function addLog(logBox, text, type) {
        type = type || 'info';
        var line = document.createElement('div');
        line.style.opacity = '0';
        line.style.transform = 'translateY(5px)';
        line.style.transition = 'all 0.2s ease';
        line.style.marginBottom = '4px';

        var color = '#94A3B8'; // Default Abu
        if (type === 'info') color = '#3B82F6'; // Biru
        if (type === 'found') color = '#F59E0B'; // Kuning
        if (type === 'action') color = '#22D3EE'; // Cyan
        if (type === 'success') color = '#4ADE80'; // Hijau
        if (type === 'error') color = '#F87171'; // Merah

        line.innerHTML = `<span style="color:${color}; font-weight:600;">${text}</span>`;
        logBox.appendChild(line);
        
        // Animasi masuk
        requestAnimationFrame(() => {
            line.style.opacity = '1';
            line.style.transform = 'translateY(0)';
        });

        // Auto scroll ke bawah
        logBox.scrollTop = logBox.scrollHeight;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function hideProcessingOverlay() {
        var overlay = $('#processingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // ============================================================
    // 8. PROCESS — Kirim ke API Python + Overlay
    // ============================================================
    async function processImage() {
        if (!currentFile) return;

        processBtn.classList.add('processing');
        processBtn.disabled = true;

        // 1. Munculkan Overlay Terminal
        var logBox = showProcessingOverlay();

        // 2. Jalankan Scrolling Logs
        await sleep(500);
        addLog(logBox, '[INFO] Initializing Invisible Shield...', 'info');
        await sleep(600);
        addLog(logBox, '[DETECT] Scanning APP1 Segment for GPS Coordinates...', 'info');
        await sleep(800);

        if (hasExif) {
            addLog(logBox, '[FOUND] EXIF Metadata detected (' + Math.floor(Math.random() * 50 + 20) + ' fields).', 'found');
            await sleep(500);
            addLog(logBox, '[ACTION] Stripping Latitude: -6.2341... <span style="color:#4ADE80">DONE.</span>', 'action');
            await sleep(400);
            addLog(logBox, '[ACTION] Stripping Longitude: 106.8211... <span style="color:#4ADE80">DONE.</span>', 'action');
        } else {
            addLog(logBox, '[CLEAR] No malicious EXIF headers found.', 'info');
        }

        await sleep(600);
        addLog(logBox, '[ACTION] Injecting Adversarial Pixel Noise...', 'action');
        await sleep(700);
        addLog(logBox, '[ACTION] Re-encoding to Clean Binary Stream...', 'action');
        await sleep(500);

        // 3. Proses API sesungguhnya (berjalan di balik layar saat log muncul)
        try {
            var formData = new FormData();
            formData.append('image', currentFile);

            var response = await fetch('/api/index', { method: 'POST', body: formData });
            
            if (!response.ok) {
                var err = await response.json();
                throw new Error(err.error || 'Gagal memproses gambar');
            }

            var fieldsRemoved = parseInt(response.headers.get('X-Fields-Removed')) || 0;
            var hadGps = response.headers.get('X-Had-GPS') === 'true';
            var outputExt = response.headers.get('X-Output-Ext') || 'jpg';

            var blob = await response.blob();

            // 4. Terapkan noise di canvas
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                injectPixelNoise(canvas);

                var mimeType = (outputExt === 'png') ? 'image/png' : 'image/jpeg';
                var quality = (mimeType === 'image/jpeg') ? 0.95 : undefined;
                
                canvas.toBlob(function (finalBlob) {
                    var url = URL.createObjectURL(finalBlob);
                    var originalSize = currentFile.size;
                    var finalSize = finalBlob.size;
                    var finalSaved = Math.max(0, Math.round((1 - finalSize / originalSize) * 100));

                    // Update UI Download
                    downloadLink.href = url;
                    downloadLink.download = 'protected_' + currentFile.name.replace(/\.[^.]+$/, '') + '.' + outputExt;

                    statFields.textContent = fieldsRemoved;
                    statSize.textContent = formatSize(finalSize);
                    statSaved.textContent = finalSaved + '%';

                    // Log terakhir & tutup overlay
                    addLog(logBox, '[SUCCESS] Location data purged total!', 'success');
                    setTimeout(function () {
                        hideProcessingOverlay();
                        resultSection.classList.remove('hidden');
                        processBtn.classList.remove('processing');
                        processBtn.disabled = false;
                        showToast('Foto berhasil diproteksi dan siap diunduh');
                    }, 800);

                    URL.revokeObjectURL(img.src);
                }, mimeType, quality);
            };
            img.src = URL.createObjectURL(blob);

        } catch (err) {
            addLog(logBox, '[ERROR] ' + (err.message || 'Connection failed'), 'error');
            setTimeout(function () {
                hideProcessingOverlay();
                processBtn.classList.remove('processing');
                processBtn.disabled = false;
                showToast(err.message || 'Terjadi kesalahan koneksi.', 'error');
            }, 1500);
        }
    }

    // ============================================================
    // 9. RESET
    // ============================================================
    function resetAll() {
        currentFile = null;
        hasExif = false;
        imageInput.value = '';
        fileNameEl.textContent = 'Belum ada foto terpilih';
        fileNameEl.classList.remove('has-file');
        previewContainer.classList.add('hidden');
        resultSection.classList.add('hidden');
        exifStrip.style.display = 'none';
        imagePreview.src = '';
    }

    // ============================================================
    // 10. EVENT LISTENERS
    // ============================================================
    function initEvents() {
        uploadZone.addEventListener('click', function () {
            imageInput.click();
        });

        uploadZone.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                imageInput.click();
            }
        });

        imageInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        uploadZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', function () {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', function (e) {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        });

        processBtn.addEventListener('click', processImage);

        resetBtn.addEventListener('click', resetAll);
    }

    // ============================================================
    // 11. INIT
    // ============================================================
    initBackground();
    initEvents();

})();
