"""Generate printable SVG QR codes after choosing a permanent PUBLIC origin."""
import sys
from pathlib import Path
from urllib.parse import urlparse
import qrcode
import qrcode.image.svg
origin = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else ''
u = urlparse(origin)
if u.scheme != 'https' or not u.netloc or u.path or u.query or u.fragment:
    raise SystemExit('Usage: python generate_qr.py https://your-public-domain.com')
out = Path(__file__).parent / 'qr'
out.mkdir(exist_ok=True)
for brand in ('skoda', 'enamor', 'wow'):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, border=4, box_size=10)
    qr.add_data(f'{origin}/{brand}')
    qr.make(fit=True)
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(out / f'{brand}.svg')
    print(f'{brand}: {origin}/{brand} -> {out / (brand + ".svg")}')
