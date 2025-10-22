
import json
import requests
from bs4 import BeautifulSoup

def get_fighter_image_url(fighter_url):
    try:
        response = requests.get(fighter_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try to find the headshot image
        image_tag = soup.find('img', {'class': 'hero-profile__image'})
        if image_tag and image_tag.get('src'):
            return image_tag['src']

        # If headshot not found, try another common image class
        image_tag = soup.find('img', {'class': 'c-bio__image'})
        if image_tag and image_tag.get('src'):
            return image_tag['src']
            
        # Fallback for different structures
        image_tag = soup.select_one("div.c-bio__image > img")
        if image_tag and image_tag.get('src'):
            return image_tag['src']

        return ""
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {fighter_url}: {e}")
        return ""

def update_rankings_images():
    with open('rankings.json', 'r', encoding='utf-8') as f:
        rankings_data = json.load(f)

    for category in rankings_data:
        for fighter in category['fighters']:
            if not fighter['image']:
                print(f"Fetching image for {fighter['name']}...")
                image_url = get_fighter_image_url(fighter['link'])
                if image_url:
                    fighter['image'] = image_url
                    print(f"  Found image: {image_url}")
                else:
                    print(f"  Image not found for {fighter['name']}")

    with open('rankings.json', 'w', encoding='utf-8') as f:
        json.dump(rankings_data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    update_rankings_images()
