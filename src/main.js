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
    const statFields      = $('#statFields');
    const statSize        = $('#statSize');
    const statSaved       = $('#statSaved');

    // === State ===
    let currentFile = null;
    let metadataInfo = { hasExif: false, fieldCount: 0, hasGPS: false, format: 'Unknown' };

    // ============================================================
    // 1. PARTICLE BACKGROUND (Warna Biru Modern Cloud)
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
                    x: Math.random() * width, y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
                    r: Math.random() * 1.4 + 0.5, alpha: Math.random() * 0.18 + 0.04
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.r), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`;
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x, dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 110) {
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.05 * (1 - dist / 110)})`;
                        ctx.lineWidth = 0.5; ctx.stroke();
                    }
                }

                const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < 140) {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - mDist / 140)})`;
                    ctx.lineWidth = 0.6; ctx.stroke();
                }
            }
            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', () => { resize(); createParticles(); });
        window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
        window.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });
        resize(); createParticles(); draw();
    }

    // ============================================================
    // 2. TOAST SYSTEM
    // ============================================================
    function showToast(message, type) {
        type = type || 'success';
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3500);
    }

    // ============================================================
    // 3. DEEP EXIF ANALYZER (Baca jumlah field & deteksi GPS spesifik)
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
                    var exifId = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6), view.getUint8(offset + 7));
                    if (exifId === 'Exif') {
                        result.hasExif = true;
                        result.fieldCount = view.getUint16(offset + 14); // Baca jumlah IFD0 Entry
                        // Scan string "GPS" di dalam data biner APP1
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
        if (!result.hasExif && view.byteLength >= 8 && view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50 && view.getUint8(2) === 0x4E && view.getUint8(3) === 0x47) {
            result.format = 'PNG';
            var off = 8;
            while (off < view.byteLength - 12) {
                var chunkLen = view.getUint32(off);
                var chunkType = String.fromCharCode(view.getUint8(off + 4), view.getUint8(off + 5), view.getUint8(off + 6), view.getUint8(off + 7));
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
                    var cType = String.fromCharCode(view.getUint8(wOff), view.getUint8(wOff + 1), view.getUint8(wOff + 2), view.getUint8(wOff + 3));
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

    // UI: Animasi Scanning
    function showScanningAnimation() {
        exifStrip.style.display = 'flex';
        exifStrip.style.background = '#F1F5F9'; exifStrip.style.borderColor = '#E2E8F0';
        exifStrip.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="color: #3B82F6; font-size: 0.9rem;"></i>
            <span class="exif-text" style="color: #3B82F6;">Membaca struktur binary...</span>
            <span class="exif-detail">Analyzing headers</span>
        `;
    }

    // UI: Hasil Scan Akurat
    function showScanResult(meta) {
        if (meta.hasExif) {
            var gpsText = meta.hasGPS ? ' — <b style="color:#DC2626">GPS Terdeteksi!</b>' : '';
            exifStrip.style.background = ''; exifStrip.style.borderColor = '';
            exifStrip.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger); font-size: 0.9rem;"></i>
                <span class="exif-text" style="color: var(--danger); font-weight: 500;">Ditemukan ${meta.fieldCount} field metadata${gpsText}</span>
                <span class="exif-detail">Format: ${meta.format}</span>
            `;
        } else {
            exifStrip.style.background = '#EFF6FF'; exifStrip.style.borderColor = '#DBEAFE';
            exifStrip.innerHTML = `
                <i class="fa-solid fa-circle-check" style="color: #22C55E; font-size: 0.9rem;"></i>
                <span class="exif-text" style="color: #15803D; font-weight: 500;">Aman — File sudah bersih (0 metadata)</span>
                <span class="exif-detail">Format: ${meta.format}</span>
            `;
        }
    }

    // ============================================================
    // 4. PIXEL NOISE INJECTION
    // ============================================================
    function injectPixelNoise(canvas) {
        var ctx = canvas.getContext('2d');
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
            var noise = (Math.random() > 0.5) ? 1 : -1;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // ============================================================
    // 5. UTILITAS
    // ============================================================
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    // ============================================================
    // 6. INLINE TERMINAL LOG (Di bawah tombol, bukan popup)
    // ============================================================
    function createInlineLog() {
        // Hapus log lama jika ada
        var oldLog = $('#processLog');
        if (oldLog) oldLog.remove();

        var logWrapper = document.createElement('div');
        logWrapper.id = 'processLog';
        logWrapper.style.cssText = `
            margin-top: 16px; border-radius: var(--radius-sm); overflow: hidden;
            border: 1px solid #334155; animation: fadeSlideUp 0.3s ease forwards;
        `;
        
        var header = document.createElement('div');
        header.style.cssText = `
            background: #1E293B; padding: 8px 12px; display: flex; align-items: center; gap: 6px;
        `;
        header.innerHTML = `
            <div style="width:8px;height:8px;border-radius:50%;background:#EF4444;"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:#F59E0B;"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:#22C55E;"></div>
            <span style="margin-left:6px; color:#64748B; font-size:0.65rem; font-family:'JetBrains Mono',monospace;">shield-process.log</span>
        `;

        var logBody = document.createElement('div');
        logBody.id = 'logBody';
        logBody.style.cssText = `
            background: #0F172A; padding: 12px; max-height: 140px; overflow-y: auto;
            font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; line-height: 1.5;
        `;
        logBody.innerHTML = `<style>#logBody::-webkit-scrollbar{width:3px}#logBody::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}</style>`;

        logWrapper.appendChild(header);
        logWrapper.appendChild(logBody);
        
        // Masukkan tepat di bawah .btn-row di dalam previewContainer
        var btnRow = previewContainer.querySelector('.btn-row');
        btnRow.after(logWrapper);

        return logBody;
    }

    function addLog(logBody, text, type) {
        type = type || 'info';
        var line = document.createElement('div');
        line.style.marginBottom = '2px';
        line.style.opacity = '0';
        line.style.transform = 'translateX(-5px)';
        line.style.transition = 'all 0.15s ease';

        var color = '#94A3B8';
        if (type === 'info') color = '#3B82F6';
        if (type === 'found') color = '#F59E0B';
        if (type === 'action') color = '#22D3EE';
        if (type === 'success') color = '#4ADE80';
        if (type === 'error') color = '#F87171';

        line.innerHTML = `<span style="color:${color}">${text}</span>`;
        logBody.appendChild(line);
        
        requestAnimationFrame(() => {
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
    // 7. FILE HANDLING & VALIDATION
    // ============================================================
    function handleFile(file) {
        var validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (validTypes.indexOf(file.type) === -1) {
            showToast('Format tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error'); return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showToast('Ukuran file terlalu besar. Maksimal 20MB.', 'error'); return;
        }

        currentFile = file;
        fileNameEl.textContent = file.name;
        fileNameEl.classList.add('has-file');
        removeInlineLog(); // Bersihkan log lama saat ganti foto

        var readerPreview = new FileReader();
        readerPreview.onload = function (e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            resultSection.classList.add('hidden');
        };
        readerPreview.readAsDataURL(file);

        showScanningAnimation();
        
        setTimeout(function() {
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
    // 8. PROCESS — Kirim ke API + Log Inline
    // ============================================================
    async function processImage() {
        if (!currentFile) return;

        processBtn.classList.add('processing');
        processBtn.disabled = true;
        resultSection.classList.add('hidden'); // Sembunyikan hasil lama

        // 1. Buat Terminal Inline
        var logBody = createInlineLog();

        // 2. Jalankan Logs
        await sleep(300);
        addLog(logBody, '[INIT] Memulai Invisible Shield...', 'info');
        await sleep(400);
        addLog(logBody, `[SCAN] Membaca format ${metadataInfo.format}...`, 'info');
        await sleep(500);

        if (metadataInfo.hasExif) {
            addLog(logBody, `[FOUND] Terdeteksi ${metadataInfo.fieldCount} field metadata aktif.`, 'found');
            await sleep(400);
            if (metadataInfo.hasGPS) {
                addLog(logBody, '[WARN] GPS IFD ditemukan. Menghapus koordinat...', 'found');
                await sleep(300);
                addLog(logBody, '[ACTION] Stripping GPS Offset... <span style="color:#4ADE80">DONE.</span>', 'action');
            } else {
                addLog(logBody, '[INFO] Tidak ada GPS, namun metadata lainnya akan dihapus.', 'info');
            }
        } else {
            addLog(logBody, '[CLEAR] Tidak ada metadata EXIF. Melewati fase stripping.', 'info');
        }

        await sleep(400);
        addLog(logBody, '[ACTION] Mengacak pixel (Adversarial Noise)...', 'action');
        await sleep(500);
        addLog(logBody, '[ACTION] Re-encoding ke binary bersih...', 'action');
        await sleep(300);

        // 3. Proses API sesungguhnya
        try {
            var formData = new FormData();
            formData.append('image', currentFile);

            var response = await fetch('/api/index', { method: 'POST', body: formData });
            
            if (!response.ok) {
                var err = await response.json();
                throw new Error(err.error || 'Gagal memproses gambar');
            }

            var fieldsRemoved = parseInt(response.headers.get('X-Fields-Removed')) || 0;
            var outputExt = response.headers.get('X-Output-Ext') || 'jpg';
            var blob = await response.blob();

            // 4. Terapkan noise di canvas lokal
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

                    downloadLink.href = url;
                    downloadLink.download = 'protected_' + currentFile.name.replace(/\.[^.]+$/, '') + '.' + outputExt;

                    statFields.textContent = fieldsRemoved;
                    statSize.textContent = formatSize(finalSize);
                    statSaved.textContent = finalSaved + '%';

                    // Log Sukses & Selesai
                    addLog(logBody, '[SUCCESS] Shield berhasil diterapkan!', 'success');
                    setTimeout(function () {
                        removeInlineLog();
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
            addLog(logBody, `[ERROR] ${err.message || 'Koneksi gagal'}`, 'error');
            setTimeout(function () {
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
        uploadZone.addEventListener('click', () => imageInput.click());
        uploadZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); imageInput.click(); } });
        imageInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });
        processBtn.addEventListener('click', processImage);
        resetBtn.addEventListener('click', resetAll);
    }

    // ============================================================
    // 11. INIT
    // ============================================================
    initBackground();
    initEvents();

})();
