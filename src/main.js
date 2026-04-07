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
    // 1. PARTICLE BACKGROUND
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
                ctx.fillStyle = `rgba(10, 143, 108, ${p.alpha})`;
                ctx.fill();

                // Garis koneksi antar partikel
                for (let j = i + 1; j < particles.length; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 110) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `rgba(10, 143, 108, ${0.05 * (1 - dist / 110)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }

                // Interaksi mouse
                const mdx = p.x - mouse.x;
                const mdy = p.y - mouse.y;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mDist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(10, 143, 108, ${0.1 * (1 - mDist / 140)})`;
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
    // 3. EXIF DETECTION (baca binary, bukan random)
    // ============================================================
    function detectExif(arrayBuffer) {
        var view = new DataView(arrayBuffer);

        // --- JPEG: cari APP1 marker (FF E1) = EXIF ---
        if (view.byteLength >= 4 && view.getUint8(0) === 0xFF && view.getUint8(1) === 0xD8) {
            var offset = 2;
            while (offset < view.byteLength - 1) {
                var marker = view.getUint16(offset);
                if (marker === 0xFFDA) break; // SOS — mulai data gambar, stop scan
                if (marker === 0xFFE1) return true; // APP1 = EXIF
                if ((marker & 0xFF00) !== 0xFF00) break; // bukan marker valid
                var segLen = view.getUint16(offset + 2);
                if (segLen < 2) break;
                offset += 2 + segLen;
            }
        }

        // --- PNG: cari eXIf chunk ---
        if (view.byteLength >= 8 &&
            view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50 &&
            view.getUint8(2) === 0x4E && view.getUint8(3) === 0x47) {
            var off = 8; // skip PNG signature
            while (off < view.byteLength - 12) {
                var chunkLen = view.getUint32(off);
                var chunkType = String.fromCharCode(
                    view.getUint8(off + 4), view.getUint8(off + 5),
                    view.getUint8(off + 6), view.getUint8(off + 7)
                );
                if (chunkType === 'eXIf') return true;
                if (chunkType === 'IEND') break;
                off += 12 + chunkLen; // 4 len + 4 type + data + 4 crc
            }
        }

        // --- WebP: cari EXIF chunk ---
        if (view.byteLength >= 12) {
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
                    if (cType === 'EXIF') return true;
                    wOff += 8 + chunkSz;
                    // WebP chunks dipadai ke even byte
                    if (chunkSz % 2 !== 0) wOff += 1;
                }
            }
        }

        return false;
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
            // +1 atau -1 pada setiap channel RGB
            var noise = (Math.random() > 0.5) ? 1 : -1;
            data[i]     = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
            // Alpha tidak disentuh
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
    // 6. FILE HANDLING & VALIDATION
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

        // Baca sebagai DataURL untuk preview
        var readerPreview = new FileReader();
        readerPreview.onload = function (e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            resultSection.classList.add('hidden');
        };
        readerPreview.readAsDataURL(file);

        // Baca sebagai ArrayBuffer untuk scan EXIF binary
        var readerBinary = new FileReader();
        readerBinary.onload = function (e) {
            hasExif = detectExif(e.target.result);
            if (hasExif) {
                exifStrip.style.display = 'flex';
                exifDetail.textContent = 'EXIF data terdeteksi dalam file';
            } else {
                exifStrip.style.display = 'none';
            }
        };
        readerBinary.readAsArrayBuffer(file);

        showToast('Foto berhasil dimuat');
    }

    // ============================================================
    // 7. PROCESS — Kirim ke API Python
    // ============================================================
    function processImage() {
        if (!currentFile) return;

        processBtn.classList.add('processing');
        processBtn.disabled = true;

        var formData = new FormData();
        formData.append('image', currentFile);

        fetch('/api/index', {
            method: 'POST',
            body: formData
        })
        .then(function (response) {
            if (!response.ok) {
                return response.json().then(function (err) {
                    throw new Error(err.error || 'Gagal memproses gambar');
                });
            }

            // Baca metadata dari custom response headers
            var fieldsRemoved = parseInt(response.headers.get('X-Fields-Removed')) || 0;
            var hadGps = response.headers.get('X-Had-GPS') === 'true';
            var newSize = parseInt(response.headers.get('X-New-Size')) || 0;
            var outputExt = response.headers.get('X-Output-Ext') || 'jpg';

            return response.blob().then(function (blob) {
                return {
                    blob: blob,
                    fieldsRemoved: fieldsRemoved,
                    hadGps: hadGps,
                    newSize: newSize,
                    outputExt: outputExt
                };
            });
        })
        .then(function (result) {
            var originalSize = currentFile.size;
            var newSize = result.blob.size; // gunakan ukuran blob aktual
            var savedPercent = Math.max(0, Math.round((1 - newSize / originalSize) * 100));

            // Terapkan pixel noise di canvas
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Inject noise sebelum download
                injectPixelNoise(canvas);

                // Encode ke blob final
                var mimeType = (result.outputExt === 'png') ? 'image/png' : 'image/jpeg';
                var quality = (mimeType === 'image/jpeg') ? 0.95 : undefined;
                canvas.toBlob(function (finalBlob) {
                    var url = URL.createObjectURL(finalBlob);
                    var finalSize = finalBlob.size;
                    var finalSaved = Math.max(0, Math.round((1 - finalSize / originalSize) * 100));

                    downloadLink.href = url;
                    downloadLink.download = 'protected_' + currentFile.name.replace(/\.[^.]+$/, '') + '.' + result.outputExt;

                    statFields.textContent = result.fieldsRemoved;
                    statSize.textContent = formatSize(finalSize);
                    statSaved.textContent = finalSaved + '%';

                    processBtn.classList.remove('processing');
                    processBtn.disabled = false;
                    resultSection.classList.remove('hidden');

                    showToast('Foto berhasil diproteksi dan siap diunduh');
                }, mimeType, quality);
            };
            img.src = URL.createObjectURL(result.blob);
        })
        .catch(function (err) {
            console.error('Error:', err);
            showToast(err.message || 'Terjadi kesalahan koneksi.', 'error');
            processBtn.classList.remove('processing');
            processBtn.disabled = false;
        });
    }

    // ============================================================
    // 8. RESET
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
    // 9. EVENT LISTENERS
    // ============================================================
    function initEvents() {
        // Klik upload zone
        uploadZone.addEventListener('click', function () {
            imageInput.click();
        });

        // Keyboard aksesibilitas
        uploadZone.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                imageInput.click();
            }
        });

        // File input change
        imageInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        // Drag & drop
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

        // Proses
        processBtn.addEventListener('click', processImage);

        // Reset
        resetBtn.addEventListener('click', resetAll);
    }

    // ============================================================
    // 10. INIT
    // ============================================================
    initBackground();
    initEvents();

})();
