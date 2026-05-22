import os
from pathlib import Path

import pandas as pd
import piexif
from PIL import Image


# ============================================================
# CONFIGURATION
# ============================================================
IMAGE_FOLDER = r"C:\Users\mrrah\Downloads\demo_images"
OUTPUT_CSV = r"C:\Users\mrrah\Downloads\image_metadata.csv"


# ============================================================
# GPS UTILITIES
# ============================================================

def dms_to_decimal(dms, ref):
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)

    if ref in [b"S", b"W"]:
        decimal *= -1

    return decimal


def extract_gps(exif_dict):
    gps_ifd = exif_dict.get("GPS", {})

    if not gps_ifd:
        return None, None

    try:
        lat = dms_to_decimal(
            gps_ifd[piexif.GPSIFD.GPSLatitude],
            gps_ifd[piexif.GPSIFD.GPSLatitudeRef]
        )

        lon = dms_to_decimal(
            gps_ifd[piexif.GPSIFD.GPSLongitude],
            gps_ifd[piexif.GPSIFD.GPSLongitudeRef]
        )

        return lat, lon

    except Exception:
        return None, None


# ============================================================
# MAIN
# ============================================================

folder = Path(IMAGE_FOLDER)

if not folder.exists():
    raise FileNotFoundError(f"Folder not found: {folder}")

image_extensions = {".jpg", ".jpeg", ".png"}

metadata_rows = []

for image_path in folder.iterdir():

    if image_path.suffix.lower() not in image_extensions:
        continue

    print("=" * 80)

    try:

        with Image.open(image_path) as img:

            file_name = image_path.name
            file_format = img.format
            width = img.width
            height = img.height
            mode = img.mode

            print(f"File      : {file_name}")
            print(f"Format    : {file_format}")
            print(f"Size      : {width} x {height}")
            print(f"Mode      : {mode}")

        lat = None
        lon = None
        google_map = None

        try:
            exif_dict = piexif.load(str(image_path))
            lat, lon = extract_gps(exif_dict)

            if lat is not None and lon is not None:
                google_map = f"https://www.google.com/maps?q={lat},{lon}"

                print(f"Latitude  : {lat:.8f}")
                print(f"Longitude : {lon:.8f}")

        except Exception:
            pass

        metadata_rows.append({
            "filename": file_name,
            "file_path": str(image_path),
            "format": file_format,
            "width": width,
            "height": height,
            "mode": mode,
            "latitude": lat,
            "longitude": lon,
            "google_maps_url": google_map
        })

    except Exception as e:
        print(f"Error reading {image_path.name}: {e}")


# ============================================================
# SAVE CSV
# ============================================================

df = pd.DataFrame(metadata_rows)

csv_path = folder / OUTPUT_CSV

df.to_csv(csv_path, index=False, encoding="utf-8")

print("\n")
print(f"Metadata exported successfully:")
print(csv_path)
print(f"Total images processed: {len(df)}")