const imageInput = document.getElementById('imageInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const processBtn = document.getElementById('processBtn');
const resultSection = document.getElementById('resultSection');
const downloadLink = document.getElementById('downloadLink');
const fileNameDisplay = document.getElementById('fileName');

// 1. Tampilkan Preview saat Foto Dipilih
imageInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            resultSection.classList.add('hidden'); // Sembunyikan hasil lama jika ganti foto
        }
        reader.readAsDataURL(file);
    }
});

// 2. Kirim Foto ke Backend (Vercel API)
processBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) return;

    processBtn.innerText = "Sedang Melindungi...";
    processBtn.disabled = true;

    const formData = new FormData();
    formData.append('image', file);

    try {
        // Memanggil API Python yang akan kita buat di folder /api
        const response = await fetch('/api/index', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Siapkan Link Download
            downloadLink.href = url;
            downloadLink.download = `protected_${file.name}`;
            
            // Tampilkan Tombol Download
            resultSection.classList.remove('hidden');
            processBtn.innerText = "Selesai!";
        } else {
            alert("Gagal memproses gambar. Coba lagi.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan koneksi.");
    } finally {
        processBtn.disabled = false;
        processBtn.innerText = "Bersihkan & Proteksi";
    }
});
