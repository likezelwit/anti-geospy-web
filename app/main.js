// ============================================================
// ZeroTrace — Logika Utama
// Client-side: analisis EXIF, komunikasi API, download
// Proteksi pixel dijalankan di server (api/index.py)
// ============================================================

(function () {
    'use strict';

    // === DOM References ===
    var $ = function (sel) { return document.querySelector(sel); };
    var bgCanvas        = $('#bgCanvas');
    var toastContainer  = $('#toastContainer');
    var uploadZone      = $('#uploadZone');
    var imageInput      = $('#imageInput');
    var fileNameEl      = $('#fileName');
    var previewContainer = $('#previewContainer');
    var imagePreview    = $('#imagePreview');
    var processBtn      = $('#processBtn');
    var resetBtn        = $('#resetBtn');
    var resultSection   = $('#resultSection');
    var downloadLink    = $('#downloadLink');
    var exifStrip       = $('#exifStrip');
    var statFields      = $('#statFields');
    var statSize        = $('#statSize');
    var statSaved       = $('#statSaved');
    var shieldDetails   = $('#shieldDetails');
    var gpsSpoofText    = $('#gpsSpoofText');

    // === State ===
    var currentFile = null;
    var metadataInfo = { hasExif: false, fieldCount: 0, hasGPS: false, format: 'Unknown' };
    // Variabel untuk menyimpan URL object agar memori bersih saat reset
    var currentObjectUrl = null; 

    // ============================================================
    // 1. PARTICLE BACKGROUND
    // ============================================================
    function initBackground() {
        var ctx = bgCanvas.getContext('2d');
        var width, height, particles;
        var mouse = { x: -1000, y: -1000 };

        function resize() {
            width = bgCanvas.width = window.innerWidth;
            height = bgCanvas.height = window.innerHeight;
        }

        function createParticles() {
            var count = Math.floor((width * height) / 20000); // Sedikit lebih banyak partikel
            particles = [];
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width, y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                    r: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.2 + 0.05
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(14, 165, 233, ' + p.alpha + ')'; // Warna sesuai tema baru (Sky Blue)
                ctx.fill();

                for (var j = i + 1; j < particles.length; j++) {
                    var q = particles[j];
                    var dx = p.x - q.x, dy = p.y - q.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = 'rgba(14, 165, 233, ' + (0.08 * (1 - dist / 120)) + ')';
                        ctx.lineWidth = 0.5; ctx.stroke();
                    }
                }

                var mdx = p.x - mouse.x, mdy = p.y - mouse.y;
                var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < 150) {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = 'rgba(14, 165, 233, ' + (0.15 * (1 - mDist / 150)) + ')';
                    ctx.lineWidth: 0.6; 
                    ctx.stroke();
                }
            }
            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', function () { resize(); createParticles(); });
        window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
        window.addEventListener('mouseleave', function () { mouse.x = -1000; mouse.y = -1000; });
        resize(); createParticles(); draw();
    }

    // ============================================================
    // 2. TOAST SYSTEM
    // ============================================================
    function showToast(message, type) {
        type = type || 'success';
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        var icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
        toast.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + message + '</span>';
        toastContainer.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('toast-out');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3500);
    }

    // ============================================================
    // 3. DEEP EXIF ANALYZER
    // ============================================================
    function analyzeMetadata(arrayBuffer) {
        var view = new DataView(arrayBuffer);
        var result = { hasExif: false, fieldCount: 0, hasGPS: false, format: 'Unknown' };

        // --- JPEG ---
        if (view.byteLength >= 4 && view.getUint8(0) === 0xFF && view.getUint8(1) === 0xD8) {
            result.format = 'JPEG';
            var offset = 2;
            while (offset < view.byteLength - 1) {
                var marker = view.getUint16(offset);
                if (marker === 0xFFDA) break;
                if ((marker & 0xFF00) !== 0xFF00) break;
                var segLen = view.getUint16(offset + 2);
                if (segLen < 2) break;
                if (marker === 0xFFE1 && offset + 16 < view.byteLength) {
                    var exifId = String.fromCharCode(
                        view.getUint8(offset + 4), view.getUint8(offset + 5),
                        view.getUint8(offset + 6), view.getUint8(offset + 7)
                    );
                    if (exifId === 'Exif') {
                        result.hasExif = true;
                        result.fieldCount = view.getUint16(offset + 14);
                        var chunkData = new Uint8Array(arrayBuffer, offset + 4, segLen - 2);
                        if (String.fromCharCode.apply(null, chunkData).indexOf('GPS') !== -1) {
                            result.hasGPS = true;
                        }
                    }
                }
                offset += 2 + segLen;
            }
        }

        // --- PNG ---
        if (!result.hasExif && view.byteLength >= 8 &&
            view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50 &&
            view.getUint8(2) === 0x4E && view.getUint8(3) === 0x47) {
            result.format = 'PNG';
            var off = 8;
            while (off < view.byteLength - 12) {
                var chunkLen = view.getUint32(off);
                var chunkType = String.fromCharCode(
                    view.getUint8(off + 4), view.getUint8(off + 5),
                    view.getUint8(off + 6), view.getUint8(off + 7)
                );
                if (chunkType === 'eXIf') {
                    result.hasExif = true;
                    if (off + 8 + 16 < view.byteLength) result.fieldCount = view.getUint16(off + 8 + 14);
                    var pngData = new Uint8Array(arrayBuffer, off + 8, chunkLen);
                    if (String.fromCharCode.apply(null, pngData).indexOf('GPS') !== -1) result.hasGPS = true;
                }
                if (chunkType === 'IEND') break;
                off += 12 + chunkLen;
            }
        }

        // --- WebP ---
        if (!result.hasExif && view.byteLength >= 12) {
            var riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
            var webp = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
            if (riff === 'RIFF' && webp === 'WEBP') {
                result.format = 'WebP';
                var wOff = 12;
                while (wOff < view.byteLength - 8) {
                    var chunkSz = view.getUint32(wOff + 4);
                    var cType = String.fromCharCode(
                        view.getUint8(wOff), view.getUint8(wOff + 1),
                        view.getUint8(wOff + 2), view.getUint8(wOff + 3)
                    );
                    if (cType === 'EXIF') {
                        result.hasExif = true;
                        if (wOff + 8 + 16 < view.byteLength) result.fieldCount = view.getUint16(wOff + 8 + 14);
                        var wData = new Uint8Array(arrayBuffer, wOff + 8, chunkSz);
                        if (String.fromCharCode.apply(null, wData).indexOf('GPS') !== -1) result.hasGPS = true;
                    }
                    wOff += 8 + chunkSz;
                    if (chunkSz % 2 !== 0) wOff += 1;
                }
            }
        }

        return result;
    }

    // ============================================================
    // 4. EXIF UI
    // ============================================================
    function showScanningAnimation() {
        exifStrip.style.display = 'flex';
        exifStrip.style.background = '#F1F5F9';
        exifStrip.style.borderColor = '#E2E8F0';
        exifStrip.innerHTML =
            '<i class="fa-solid fa-circle-notch fa-spin" style="color: #0EA5E9; font-size: 0.9rem;"></i>' +
            '<span class="exif-text" style="color: #64748B;">Menganalisis struktur file...</span>' +
            '<span class="exif-detail">Scanning Binary</span>';
    }

    function showScanResult(meta) {
        if (meta.hasExif) {
            var gpsText = meta.hasGPS
                ? ' — <b style="color:#DC2626">GPS Terdeteksi!</b>'
                : '';
            exifStrip.style.background = '';
            exifStrip.style.borderColor = '';
            exifStrip.innerHTML =
                '<i class="fa-solid fa-triangle-exclamation" style="color: var(--danger); font-size: 0.9rem;"></i>' +
                '<span class="exif-text" style="color: var(--danger); font-weight: 500;">Ditemukan ' + meta.fieldCount + ' field metadata' + gpsText + '</span>' +
                '<span class="exif-detail">Format: ' + meta.format + '</span>';
        } else {
            exifStrip.style.background = '#F0FDF4';
            exifStrip.style.borderColor = '#BBF7D0';
            exifStrip.innerHTML =
                '<i class="fa-solid fa-circle-check" style="color: #16A34A; font-size: 0.9rem;"></i>' +
                '<span class="exif-text" style="color: #15803D; font-weight: 500;">Aman — Tidak ada metadata</span>' +
                '<span class="exif-detail">Format: ' + meta.format + '</span>';
        }
    }

    // ============================================================
    // 5. UTILITAS
    // ============================================================
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    // ============================================================
    // 6. INLINE TERMINAL LOG
    // ============================================================
    function createInlineLog() {
        var oldLog = $('#processLog');
        if (oldLog) oldLog.remove();

        var logWrapper = document.createElement('div');
        logWrapper.id = 'processLog';
        logWrapper.style.cssText =
            'margin-top: 16px; border-radius: var(--radius-sm); overflow: hidden;' +
            'border: 1px solid #334155; animation: fadeSlideUp 0.3s ease forwards;';

        var header = document.createElement('div');
        header.style.cssText =
            'background: #0F172A; padding: 8px 12px; display: flex; align-items: center; gap: 6px;';
        header.innerHTML =
            '<div style="width:8px;height:8px;border-radius:50%;background:#EF4444;"></div>' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#F59E0B;"></div>' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#22C55E;"></div>' +
            '<span style="margin-left:6px; color:#94A3B8; font-size:0.65rem; font-family:\'JetBrains Mono\',monospace;">zerotrace-shield.log</span>';

        var logBody = document.createElement('div');
        logBody.id = 'logBody';
        logBody.style.cssText =
            'background: #020617; padding: 12px; max-height: 180px; overflow-y: auto;' +
            'font-family: \'JetBrains Mono\', monospace; font-size: 0.7rem; line-height: 1.6;';
        logBody.innerHTML = '<style>#logBody::-webkit-scrollbar{width:3px}#logBody::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}</style>';

        logWrapper.appendChild(header);
        logWrapper.appendChild(logBody);

        var btnRow = previewContainer.querySelector('.btn-row');
        if (btnRow) btnRow.after(logWrapper);

        return logBody;
    }

    function addLog(logBody, text, type) {
        type = type || 'info';
        var line = document.createElement('div');
        line.style.cssText = 'margin-bottom: 2px; opacity: 0; transform: translateX(-5px); transition: all 0.15s ease;';

        var color = '#94A3B8';
        if (type === 'info')    color = '#38BDF8'; // Sky blue
        if (type === 'found')   color = '#FBBF24'; // Amber
        if (type === 'action')  color = '#22D3EE'; // Cyan
        if (type === 'success') color = '#4ADE80'; // Green
        if (type === 'warn')    color = '#FB923C'; // Orange
        if (type === 'error')   color = '#F87171'; // Red

        line.innerHTML = '<span style="color:' + color + '">' + text + '</span>';
        logBody.appendChild(line);
        requestAnimationFrame(function () {
            line.style.opacity = '1';
            line.style.transform = 'translateX(0)';
        });
        logBody.scrollTop = logBody.scrollHeight;
    }

    function removeInlineLog() {
        var log = $('#processLog');
        if (log) log.remove();
    }

    // ============================================================
    // 7. FILE HANDLING
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
        removeInlineLog();

        var readerPreview = new FileReader();
        readerPreview.onload = function (e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            resultSection.classList.add('hidden');
        };
        readerPreview.readAsDataURL(file);

        showScanningAnimation();

        setTimeout(function () {
            var readerBinary = new FileReader();
            readerBinary.onload = function (e) {
                metadataInfo = analyzeMetadata(e.target.result);
                showScanResult(metadataInfo);
            };
            readerBinary.readAsArrayBuffer(file);
        }, 600);

        showToast('Foto berhasil dimuat');
    }

    // ============================================================
    // 8. PROCESS — Kirim ke API
    // ============================================================
    async function processImage() {
        if (!currentFile) return;

        // Revoke URL lama jika ada
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        processBtn.classList.add('processing');
        processBtn.disabled = true;
        resultSection.classList.add('hidden');

        var logBody = createInlineLog();

        // ── Log phase 1: Metadata scan ──
        await sleep(300);
        addLog(logBody, '[INIT] Memulai ZeroTrace Shield v2.0...', 'info');
        await sleep(350);
        addLog(logBody, '[SCAN] Format: ' + metadataInfo.format + ' | Ukuran: ' + formatSize(currentFile.size), 'info');
        await sleep(400);

        if (metadataInfo.hasExif) {
            addLog(logBody, '[FOUND] ' + metadataInfo.fieldCount + ' field metadata aktif terdeteksi.', 'found');
            await sleep(350);
            if (metadataInfo.hasGPS) {
                addLog(logBody, '[WARN] GPS IFD ditemukan — koordinat asli tersimpan!', 'found');
                await sleep(300);
                addLog(logBody, '[ACT] Menghapus seluruh EXIF & GPS offset...', 'action');
            } else {
                addLog(logBody, '[INFO] Tidak ada GPS, tapi metadata lain akan dihapus total.', 'info');
            }
        } else {
            addLog(logBody, '[CLEAR] Tidak ada EXIF. Melewati fase stripping.', 'info');
        }

        // ── Log phase 2: Proteksi pixel ──
        await sleep(400);
        addLog(logBody, '[ACT] High-freq disruption — modifikasi edge & tekstur...', 'action');
        await sleep(450);
        addLog(logBody, '[ACT] Gradient-aware adversarial noise (adaptive intensity)...', 'action');
        await sleep(400);
        addLog(logBody, '[ACT] Chromatic aberration shift — putus channel alignment...', 'action');
        await sleep(350);
        addLog(logBody, '[ACT] Geometric distortion — rotasi 0.2-0.5 derajat...', 'action');
        await sleep(300);
        addLog(logBody, '[ACT] Color space manipulation — shift saturasi & brightness...', 'action');

        // ── Log phase 3: API call ──
        await sleep(400);
        addLog(logBody, '[NET] Mengirim ke server untuk eksekusi...', 'info');
        await sleep(200);

        try {
            var formData = new FormData();
            formData.append('image', currentFile);

            // Pastikan endpoint API sesuai struktur folder Anda
            var response = await fetch('/api/index', { method: 'POST', body: formData });

            if (!response.ok) {
                var err = await response.json();
                throw new Error(err.error || 'Gagal memproses gambar');
            }

            // Baca headers
            var fieldsRemoved = parseInt(response.headers.get('X-Fields-Removed')) || 0;
            var outputExt = response.headers.get('X-Output-Ext') || 'jpg';
            var noiseApplied = response.headers.get('X-Noise-Applied') || 'false';
            var highFreq = response.headers.get('X-High-Freq') || 'false';
            var distortion = response.headers.get('X-Distortion') || 'false';
            var chromatic = response.headers.get('X-Chromatic-Shift') || 'false';
            var fakeGPS = response.headers.get('X-Fake-GPS') || 'skipped';

            var blob = await response.blob();
            var finalSize = blob.size;
            var originalSize = currentFile.size;
            var finalSaved = Math.max(0, Math.round((1 - finalSize / originalSize) * 100));

            // ── Log hasil ──
            await sleep(300);
            addLog(logBody, '[OK] EXIF stripped: ' + fieldsRemoved + ' field dihapus', 'success');
            addLog(logBody, '[OK] High-freq disrupt: ' + highFreq, 'success');
            addLog(logBody, '[OK] Adversarial noise: ' + noiseApplied, 'success');
            addLog(logBody, '[OK] Chromatic shift: ' + chromatic, 'success');
            addLog(logBody, '[OK] Geometric distortion: ' + distortion, 'success');

            if (fakeGPS !== 'skipped-png') {
                var parts = fakeGPS.split(',');
                var latDir = parseFloat(parts[0]) >= 0 ? 'N' : 'S';
                var lonDir = parseFloat(parts[1]) >= 0 ? 'E' : 'W';
                addLog(logBody, '[OK] Fake GPS injected: ' +
                    Math.abs(parseFloat(parts[0])).toFixed(2) + '°' + latDir + ', ' +
                    Math.abs(parseFloat(parts[1])).toFixed(2) + '°' + lonDir, 'success');
            } else {
                addLog(logBody, '[INFO] Fake GPS: dilewati (output PNG)', 'warn');
            }

            addLog(logBody, '[OK] Output: ' + formatSize(finalSize) + ' (' + finalSaved + '% lebih ringan)', 'success');
            await sleep(200);
            addLog(logBody, '[DONE] Shield aktif. Foto siap diunduh.', 'success');

            // ── Siapkan download ──
            currentObjectUrl = URL.createObjectURL(blob);
            downloadLink.href = currentObjectUrl;
            downloadLink.download = 'zerotrace_' + currentFile.name.replace(/\.[^.]+$/, '') + '.' + outputExt;

            // ── Update statistik ──
            statFields.textContent = fieldsRemoved;
            statSize.textContent = formatSize(finalSize);
            statSaved.textContent = finalSaved + '%';

            // ── Update shield details ──
            gpsSpoofText.textContent = fakeGPS !== 'skipped-png'
                ? 'Fake GPS: ' + fakeGPS.replace(',', '°, ') + '°'
                : 'Fake GPS: Dilewati (PNG)';

            await sleep(1000);
            removeInlineLog();
            resultSection.classList.remove('hidden');
            processBtn.classList.remove('processing');
            processBtn.disabled = false;
            showToast('Foto berhasil diproteksi — siap diunduh');

        } catch (err) {
            addLog(logBody, '[ERROR] ' + (err.message || 'Koneksi gagal'), 'error');
            await sleep(1500);
            processBtn.classList.remove('processing');
            processBtn.disabled = false;
            removeInlineLog();
            showToast(err.message || 'Terjadi kesalahan koneksi.', 'error');
        }
    }

    // ============================================================
    // 9. RESET
    // ============================================================
    function resetAll() {
        // Revoke URL lama
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        currentFile = null;
        metadataInfo = { hasExif: false, fieldCount: 0, hasGPS: false, format: 'Unknown' };
        imageInput.value = '';
        fileNameEl.textContent = 'Belum ada foto terpilih';
        fileNameEl.classList.remove('has-file');
        previewContainer.classList.add('hidden');
        resultSection.classList.add('hidden');
        exifStrip.style.display = 'none';
        imagePreview.src = '';
        removeInlineLog();
    }

    // ============================================================
    // 10. EVENT LISTENERS
    // ============================================================
    function initEvents() {
        uploadZone.addEventListener('click', function () { imageInput.click(); });
        uploadZone.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); imageInput.click(); }
        });
        imageInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });
        uploadZone.addEventListener('dragover', function (e) {
            e.preventDefault(); uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', function () {
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', function (e) {
            e.preventDefault(); uploadZone.classList.remove('drag-over');
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