# import os
# import cv2
# import numpy as np
# from PIL import Image, ImageDraw, ImageFont
# import arabic_reshaper
# from bidi.algorithm import get_display

# os.environ["FLAGS_use_mkldnn"] = "0"
# os.environ["FLAGS_enable_pir_api"] = "0"

# from paddleocr import PaddleOCR


# IMAGE_PATH = r"D:\WhereSoft\POCs\Illegal_shop_detection\documents\street_data_madinah\18_May_2026\images\3.png"
# OUTPUT_PATH = r"C:\Users\mrrah\Downloads\ocr_output.png"


# def draw_arabic_text(img_pil, text, position, font, color=(255, 0, 0)):
#     # reshape Arabic
#     reshaped = arabic_reshaper.reshape(text)
#     bidi_text = get_display(reshaped)

#     draw = ImageDraw.Draw(img_pil)
#     draw.text(position, bidi_text, font=font, fill=color)


# def main():

#     print("Loading OCR...")
#     ocr = PaddleOCR(lang="ar")

#     print("Running OCR...")
#     result = ocr.predict(IMAGE_PATH)

#     # Open image
#     image = cv2.imread(IMAGE_PATH)

#     # Convert for PIL (for Arabic text)
#     image_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

#     # Use a font that supports Arabic
#     font = ImageFont.truetype("arial.ttf", 20)

#     for page in result:
#         boxes = page.get("rec_polys", [])
#         texts = page.get("rec_texts", [])
#         scores = page.get("rec_scores", [])

#         for box, text, score in zip(boxes, texts, scores):

#             box = box.astype(int)

#             # Draw bounding box (OpenCV OK)
#             cv2.polylines(image, [box], True, (0, 255, 0), 2)

#             # Position text
#             x, y = box[0]
#             label = f"{text} ({score:.2f})"

#             # Draw Arabic-safe text using PIL
#             draw_arabic_text(
#                 image_pil,
#                 label,
#                 (int(x), max(int(y) - 25, 10)),
#                 font
#             )

#     # Merge PIL text back to OpenCV image
#     image = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)

#     cv2.imwrite(OUTPUT_PATH, image)

#     print(f"Saved: {OUTPUT_PATH}")


# if __name__ == "__main__":
#     main()



# import os
# import cv2
# import numpy as np
# from paddleocr import PaddleOCR

# os.environ["FLAGS_use_mkldnn"] = "0"
# os.environ["FLAGS_enable_pir_api"] = "0"

# IMAGE_PATH = r"C:\Users\mrrah\Downloads\test_image.png"


# def sort_key(box):
#     # box = [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
#     # use top-left point
#     return box[0][1], box[0][0]  # (y, x)


# def group_lines(boxes, texts, scores, y_threshold=20):
#     """
#     Group words into lines based on Y coordinate
#     """
#     items = list(zip(boxes, texts, scores))

#     # sort by y then x
#     items.sort(key=lambda x: sort_key(x[0]))

#     lines = []
#     current_line = []
#     last_y = None

#     for box, text, score in items:
#         y = box[0][1]

#         if last_y is None:
#             current_line.append((box, text, score))
#             last_y = y
#             continue

#         # same line
#         if abs(y - last_y) < y_threshold:
#             current_line.append((box, text, score))
#         else:
#             lines.append(current_line)
#             current_line = [(box, text, score)]

#         last_y = y

#     if current_line:
#         lines.append(current_line)

#     return lines


# def build_sentences(lines):
#     sentences = []

#     for line in lines:
#         # sort left to right inside line
#         line = sorted(line, key=lambda x: x[0][0][0])

#         words = [item[1] for item in line]
#         sentence = " ".join(words)

#         sentences.append(sentence)

#     return sentences


# def main():

#     ocr = PaddleOCR(lang="ar")

#     result = ocr.predict(IMAGE_PATH)

#     all_boxes = []
#     all_texts = []
#     all_scores = []

#     for page in result:
#         all_boxes.extend(page["rec_polys"])
#         all_texts.extend(page["rec_texts"])
#         all_scores.extend(page["rec_scores"])

#     # Step 1: group into lines
#     lines = group_lines(all_boxes, all_texts, all_scores)

#     # Step 2: build sentences
#     sentences = build_sentences(lines)

#     print("\n===== FINAL SENTENCES =====\n")

#     for s in sentences:
#         print(s)


# if __name__ == "__main__":
#     main()



import os
import json
import requests

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_KEY")

IMAGE_PATH = r"C:\Users\mrrah\Downloads\4.jpg"

url = (
    f"{AZURE_ENDPOINT}/computervision/imageanalysis:analyze"
    "?api-version=2024-02-01&features=read"
)

headers = {
    "Ocp-Apim-Subscription-Key": AZURE_KEY,
    "Content-Type": "application/octet-stream"
}

with open(IMAGE_PATH, "rb") as f:
    image_data = f.read()

response = requests.post(
    url,
    headers=headers,
    data=image_data
)

response.raise_for_status()

result = response.json()

print(json.dumps(result, indent=2, ensure_ascii=False))

# Extract text
print("\n===== OCR TEXT =====\n")

if "readResult" in result:
    for block in result["readResult"]["blocks"]:
        for line in block["lines"]:
            print(line["text"])