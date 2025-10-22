from bs4 import BeautifulSoup
import json
import os

# Path to the HTML file
html_path = os.path.join("C:", os.sep, "Users", "Lee", "OneDrive", "바탕 화면", "대학", "3-2", "나노랩 심화2 (백우진)", "ufc insight", "ufc 선수 데이터", "korean_fighters.html")
output_path = os.path.join("C:", os.sep, "Users", "Lee", "OneDrive", "바탕 화면", "대학", "3-2", "나노랩 심화2 (백우진)", "ufc insight", "korean_fighters.json")
# Base path for images, assuming they are in a similar directory structure
base_image_path = os.path.join("C:", os.sep, "Users", "Lee", "OneDrive", "바탕 화면", "대학", "3-2", "나노랩 심화2 (백우진)", "ufc insight", "ufc 선수 데이터", "틀_역대 UFC 한국인 파이터 - 나무위키_files")


try:
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
except FileNotFoundError:
    print(f"Error: HTML file not found at {html_path}")
    exit()

soup = BeautifulSoup(html_content, 'html.parser')

fighters = []

# Find all links
all_links = soup.find_all('a')

for link in all_links:
    href = link.get('href')
    if href and '/w/' in href and 'title' in link.attrs:
        name = link.text.strip()
        # Basic filtering for names
        if name and len(name) > 1 and len(name) < 10 and not any(char.isdigit() for char in name):
            # Find the image. This is tricky. Let's assume the image is in a nearby `img` tag.
            # This part is a guess and might need refinement.
            parent = link.find_parent('td')
            if not parent:
                parent = link.find_parent('div')

            image_tag = None
            if parent:
                image_tag = parent.find('img')

            image_abs_path = ""
            if image_tag:
                img_src = image_tag.get('src')
                if img_src:
                    image_filename = os.path.basename(img_src)
                    image_abs_path = os.path.join(base_image_path, image_filename).replace('\\', '/')

            fighters.append({
                "name": name,
                "image": image_abs_path
            })


# Remove duplicates
unique_fighters = []
seen_names = set()
for fighter in fighters:
    if fighter['name'] and fighter['name'] not in seen_names:
        unique_fighters.append(fighter)
        seen_names.add(fighter['name'])


with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(unique_fighters, f, indent=2, ensure_ascii=False)

print(f"Successfully parsed {len(unique_fighters)} fighters and saved to {output_path}")
