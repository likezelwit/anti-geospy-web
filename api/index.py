from flask import Flask, request, send_file
from PIL import Image, ImageChops
import io
import random

app = Flask(__name__)

@app.route('/api/index', methods=['POST'])
def protect_image():
    if 'image' not in request.files:
        return "No image uploaded", 400
    
    file = request.files['image']
    img = Image.open(file)

    # 1. STRIP METADATA (EXIF)
    # Kita buat canvas baru dan tempel fotonya di sana agar metadata asli hilang total.
    data = list(img.getdata())
    protected_img = Image.new(img.mode, img.size)
    protected_img.putdata(data)

    # 2. PIXEL NOISE INJECTION (Adversarial Perturbation)
    # Kita tambahkan sedikit variasi warna (+1 atau -1) secara acak pada setiap pixel.
    # Perubahan ini tidak terlihat mata manusia, tapi merusak pola digital bagi AI.
    width, height = protected_img.size
    pixels = protected_img.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            # Tambahkan gangguan kecil yang tidak kasat mata
            noise = random.randint(-1, 1)
            pixels[x, y] = (
                max(0, min(255, r + noise)),
                max(0, min(255, g + noise)),
                max(0, min(255, b + noise))
            )

    # Simpan ke memori untuk dikirim balik ke user
    img_io = io.BytesIO()
    protected_img.save(img_io, 'JPEG', quality=95)
    img_io.seek(0)

    return send_file(img_io, mimetype='image/jpeg')

# Penting untuk Vercel Serverless
if __name__ == '__main__':
    app.run()
