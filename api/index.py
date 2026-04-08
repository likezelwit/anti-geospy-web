from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image, ImageEnhance, ImageFilter
import piexif
import numpy as np
import io
import random
import math

app = Flask(__name__)
# Mengizinkan CORS untuk semua origin, penting untuk komunikasi API
CORS(app, expose_headers=[
    'X-Fields-Removed', 'X-Had-GPS', 'X-New-Size', 'X-Output-Ext',
    'X-Noise-Applied', 'X-Fake-GPS', 'X-Distortion', 'X-High-Freq',
    'X-Chromatic-Shift'
])

# ================================================================
# Decoy GPS — Lokasi palsu untuk menyesatkan
# ================================================================
DECOY_LOCATIONS = [
    (0.0, 0.0),            # Null Island
    (-45.0, -30.0),        # Atlantik Selatan
    (30.0, -160.0),        # Pasifik Utara
    (-55.0, -130.0),       # Pasifik Selatan
    (20.0, 65.0),          # Laut Arab
    (-30.0, 80.0),         # Samudra Hindia
    (64.1, -21.9),         # Reykjavik
    (35.7, 139.7),         # Tokyo
    (-33.9, 18.4),         # Cape Town
    (55.8, 37.6),          # Moskow
    (19.4, -99.1),         # Mexico City
    (-22.9, -43.2),        # Rio de Janeiro
    (51.5, -0.1),          # London
    (37.6, 127.0),         # Seoul
    (1.3, 103.8),          # Singapura
]

def generate_fake_gps_exif():
    """Buat EXIF binary dengan GPS IFD palsu."""
    lat, lon = random.choice(DECOY_LOCATIONS)

    def to_dms(decimal, ref_pos, ref_neg):
        sign = 1 if decimal >= 0 else -1
        decimal = abs(decimal)
        degrees = int(decimal)
        minutes_full = (decimal - degrees) * 60
        minutes = int(minutes_full)
        seconds = round((minutes_full - minutes) * 60, 4)
        seconds_int = int(seconds * 10000)
        ref = ref_pos if sign >= 0 else ref_neg
        return ((degrees, 1), (minutes, 1), (seconds_int, 10000)), ref

    gps_lat, gps_lat_ref = to_dms(lat, 'N', 'S')
    gps_lon, gps_lon_ref = to_dms(lon, 'E', 'W')

    exif_dict = {
        '0th': {piexif.ImageIFD.Make: b'Generic', piexif.ImageIFD.Model: b'Shielded'},
        'Exif': {piexif.ExifIFD.DateTimeOriginal: b'2024:01:01 00:00:00'},
        'GPS': {
            piexif.GPSIFD.GPSVersionID: (2, 2, 0, 0),
            piexif.GPSIFD.GPSLatitudeRef: gps_lat_ref.encode(),
            piexif.GPSIFD.GPSLatitude: gps_lat,
            piexif.GPSIFD.GPSLongitudeRef: gps_lon_ref.encode(),
            piexif.GPSIFD.GPSLongitude: gps_lon,
            piexif.GPSIFD.GPSAltitudeRef: b'\x00',
            piexif.GPSIFD.GPSAltitude: (random.randint(10, 800), 1),
            piexif.GPSIFD.GPSMapDatum: b'WGS-84',
        },
        '1st': {},
    }

    return piexif.dump(exif_dict), lat, lon

def disrupt_high_frequencies(img):
    try:
        blurred = img.filter(ImageFilter.GaussianBlur(radius=2))
        blurred_arr = np.array(blurred, dtype=np.float32)
        orig_arr = np.array(img, dtype=np.float32)
        high_freq = orig_arr - blurred_arr
        modifier = np.random.uniform(0.90, 1.10, orig_arr.shape).astype(np.float32)
        modified_high = high_freq * modifier
        result = np.clip(blurred_arr + modified_high, 0, 255).astype(np.uint8)
        return Image.fromarray(result, img.mode)
    except Exception:
        return img

def apply_adversarial_noise(img):
    try:
        arr = np.array(img, dtype=np.int16)
        busyness = float(np.std(arr))
        intensity = 1 if busyness < 15 else (2 if busyness < 35 else 3)

        gray = np.array(img.convert('L'), dtype=np.float32)
        gx = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
        gy = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
        gradient = (gx + gy) / 2.0

        grad_max = gradient.max()
        gradient_norm = gradient / grad_max if grad_max > 0 else gradient

        noise = np.random.randint(-intensity, intensity + 1, arr.shape, dtype=np.int16)
        edge_factor = np.clip(gradient_norm * 2.5, 0, 1)

        if arr.ndim == 3:
            edge_factor = edge_factor[:, :, np.newaxis]
            channel_offset = np.random.randint(-1, 2, (1, 1, arr.shape[2]), dtype=np.int16)
            scaled_noise = (noise * (0.25 + 0.75 * edge_factor)).astype(np.int16) + channel_offset
        else:
            scaled_noise = (noise * (0.25 + 0.75 * edge_factor)).astype(np.int16)

        arr = np.clip(arr + scaled_noise, 0, 255).astype(np.uint8)
        return Image.fromarray(arr, img.mode)
    except Exception:
        return img

def apply_chromatic_shift(img, max_shift=1):
    try:
        if img.mode == 'RGBA':
            r, g, b, a = img.split()
            channels = [r, g, b, a]
            fill = 0
        elif img.mode == 'RGB':
            r, g, b = img.split()
            channels = [r, g, b]
            fill = 255
        else:
            return img

        w, h = img.size
        # Hanya shift R dan G
        for idx in [0, 1]:
            dx = random.randint(-max_shift, max_shift)
            dy = random.randint(-max_shift, max_shift)
            if dx != 0 or dy != 0:
                channels[idx] = channels[idx].transform(
                    (w, h), Image.AFFINE, (1, 0, dx, 0, 1, dy),
                    resample=Image.BICUBIC, fillcolor=fill
                )

        return Image.merge(img.mode, channels)
    except Exception:
        return img

def apply_subtle_distortion(img):
    try:
        w, h = img.size
        if w < 50 or h < 50: return img
        angle = random.uniform(-0.5, 0.5)
        fill = (0, 0, 0, 0) if 'A' in img.mode else (255, 255, 255)
        rotated = img.rotate(angle, expand=True, resample=Image.BICUBIC, fillcolor=fill)
        rw, rh = rotated.size
        left = (rw - w) // 2
        top = (rh - h) // 2
        return rotated.crop((left, top, left + w, top + h))
    except Exception:
        return img

def apply_color_shift(img):
    try:
        img = ImageEnhance.Color(img).enhance(random.uniform(0.96, 1.04))
        img = ImageEnhance.Brightness(img).enhance(random.uniform(0.99, 1.01))
        return img
    except Exception:
        return img

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

        # Analisis Metadata Awal
        exif_raw = img.info.get('exif', b'')
        field_count = 0
        has_gps = False
        try:
            if exif_raw:
                exif_dict = piexif.load(exif_raw)
                field_count = (len(exif_dict.get('0th', {})) +
                               len(exif_dict.get('Exif', {})) +
                               len(exif_dict.get('GPS', {})) +
                               len(exif_dict.get('1st', {})))
                has_gps = len(exif_dict.get('GPS', {})) > 0
        except Exception:
            has_gps = b'GPS' in exif_raw
            field_count = 1 if exif_raw else 0

        # Tentukan Output Format
        has_alpha = img.mode in ('RGBA', 'LA', 'PA')
        if has_alpha:
            out_format, mime, ext = 'PNG', 'image/png', 'png'
            working = img.convert('RGBA')
        else:
            out_format, mime, ext = 'JPEG', 'image/jpeg', 'jpg'
            working = img.convert('RGB')

        # Strip Metadata (Canvas Baru)
        clean = Image.new(working.mode, working.size,
                          (0, 0, 0, 0) if has_alpha else (255, 255, 255))
        clean.paste(working)

        # Terapkan Proteksi Layer
        clean = disrupt_high_frequencies(clean)
        clean = apply_adversarial_noise(clean)
        clean = apply_chromatic_shift(clean, max_shift=1)
        clean = apply_subtle_distortion(clean)
        clean = apply_color_shift(clean)
        clean = ImageEnhance.Sharpness(clean).enhance(1.03)

        # Encode & Inject Fake GPS
        buf = io.BytesIO()
        fake_lat, fake_lon = None, None

        if out_format == 'JPEG':
            try:
                fake_exif_bytes, fake_lat, fake_lon = generate_fake_gps_exif()
                clean.save(buf, format='JPEG', quality=95, optimize=True, exif=fake_exif_bytes)
            except Exception:
                clean.save(buf, format='JPEG', quality=95, optimize=True)
        else:
            clean.save(buf, format='PNG', optimize=True)

        buf.seek(0)
        new_size = buf.getbuffer().nbytes

        resp = send_file(buf, mimetype=mime)
        resp.headers['X-Fields-Removed'] = str(field_count)
        resp.headers['X-Had-GPS'] = str(has_gps).lower()
        resp.headers['X-New-Size'] = str(new_size)
        resp.headers['X-Output-Ext'] = ext
        resp.headers['X-Noise-Applied'] = 'true'
        resp.headers['X-High-Freq'] = 'true'
        resp.headers['X-Distortion'] = 'true'
        resp.headers['X-Chromatic-Shift'] = 'true'

        if fake_lat is not None:
            resp.headers['X-Fake-GPS'] = f'{fake_lat:.2f},{fake_lon:.2f}'
        else:
            resp.headers['X-Fake-GPS'] = 'skipped-png'

        return resp

    except Exception as e:
        return jsonify({"error": f"Gagal memproses: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)