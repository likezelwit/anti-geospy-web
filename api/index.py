from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image
import io

app = Flask(__name__)
CORS(app, expose_headers=[
    'X-Fields-Removed', 'X-Had-GPS', 'X-New-Size', 'X-Output-Ext'
])

@app.route('/api/index', methods=['POST'])
def protect_image():
    if 'image' not in request.files:
        return jsonify({"error": "Tidak ada gambar yang diunggah"}), 400

    file = request.files['image']
    allowed = {'image/jpeg', 'image/png', 'image/webp'}
    if file.content_type not in allowed:
        return jsonify({"error": "Format tidak didukung. Gunakan JPG, PNG, atau WebP."}), 400

    try:
        img = Image.open(file.stream)

        # Kumpulkan info metadata SEBELUM di-strip
        exif = img.getexif()
        field_count = len(exif) if exif else 0
        has_gps = bool(exif.get(34853)) if exif else False  # Tag GPSInfoIFD

        # Tentukan apakah gambar punya transparansi
        has_alpha = img.mode in ('RGBA', 'LA', 'PA')

        # 1. STRIP METADATA — buat canvas baru, tempel pixel, metadata hilang total
        if has_alpha:
            clean = Image.new('RGBA', img.size, (0, 0, 0, 0))
            clean.paste(img)
            out_format, mime, ext = 'PNG', 'image/png', 'png'
        else:
            rgb = img.convert('RGB')  # Tangani grayscale, palette, CMYK, dll
            clean = Image.new('RGB', rgb.size, (255, 255, 255))
            clean.paste(rgb)
            out_format, mime, ext = 'JPEG', 'image/jpeg', 'jpg'

        # 2. Encode ke memori
        buf = io.BytesIO()
        save_opts = {'format': out_format, 'optimize': True}
        if out_format == 'JPEG':
            save_opts['quality'] = 95
        clean.save(buf, **save_opts)
        buf.seek(0)
        new_size = buf.getbuffer().nbytes

        # Kirim gambar + metadata info via response headers
        resp = send_file(buf, mimetype=mime)
        resp.headers['X-Fields-Removed'] = str(field_count)
        resp.headers['X-Had-GPS'] = str(has_gps).lower()
        resp.headers['X-New-Size'] = str(new_size)
        resp.headers['X-Output-Ext'] = ext
        return resp

    except Exception as e:
        return jsonify({"error": f"Gagal memproses: {str(e)}"}), 500


# Untuk testing lokal: python api/index.py
if __name__ == '__main__':
    app.run(port=5000, debug=True)
