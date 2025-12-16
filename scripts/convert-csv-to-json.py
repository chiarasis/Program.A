#!/usr/bin/env python3
import csv
import json
import os
import glob

csv_path = '/Users/afe28/Downloads/Culturiamoci Archivio Foglio1.csv'
output_path = '/Users/afe28/Documents/GitHub/Program.A/src/data/opere.json'
images_dir = '/Users/afe28/Documents/GitHub/Program.A/public/drive-opere'

opere = []
id_counter = 1

# Get all image files in the directory
image_files = {}
for ext in ['jpg', 'jpeg', 'png', 'webp']:
    for img_path in glob.glob(f"{images_dir}/*.{ext}"):
        basename = os.path.basename(img_path)
        name_without_ext = os.path.splitext(basename)[0]
        image_files[name_without_ext.lower()] = basename

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    
    for row in reader:
        # Skip empty rows
        if not row.get('Autore (Nome e Cognome') or not row.get('Titolo'):
            continue
            
        artist = row.get('Autore (Nome e Cognome', '').strip()
        group = row.get('Gruppo di appartenenza', '').strip()
        title = row.get('Titolo', '').strip()
        year = row.get('Anno', '').strip()
        technique = row.get('Tecnica, dimensioni (cm 10x10x10)', '').strip()
        location = row.get('Ubicazione', '').strip()
        filename = row.get('Nome file (Cognome_Titolo)', '').strip()
        
        # Skip if no artist or title
        if not artist or not title:
            continue
        
        # Find the actual image file
        image_path = ""
        if filename:
            # Look for the file with any extension
            filename_lower = filename.lower()
            
            # Debug first 3
            if id_counter <= 3:
                print(f"DEBUG ID {id_counter}: filename='{filename}' -> lower='{filename_lower}'")
                print(f"  Exists in dict: {filename_lower in image_files}")
                if filename_lower in image_files:
                    print(f"  Found: {image_files[filename_lower]}")
            
            if filename_lower in image_files:
                image_path = f"/drive-opere/{image_files[filename_lower]}"
            else:
                # Try without spaces/normalization
                for name, file in image_files.items():
                    if name.replace(' ', '').replace('_', '') == filename_lower.replace(' ', '').replace('_', ''):
                        image_path = f"/drive-opere/{file}"
                        break
        
        # Fallback: construct from artist and title
        if not image_path:
            last_name = artist.split()[-1] if ' ' in artist else artist
            search_name = f"{last_name}_{title}".lower()
            if search_name in image_files:
                image_path = f"/drive-opere/{image_files[search_name]}"
        
        # Last fallback: just use the filename from CSV with .jpg
        if not image_path and filename:
            image_path = f"/drive-opere/{filename}.jpg"
        
        opera = {
            "id": id_counter,
            "title": title,
            "artist": artist,
            "year": year,
            "group": group,
            "technique": technique,
            "location": location,
            "image": image_path
        }
        
        opere.append(opera)
        id_counter += 1

# Write JSON
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(opere, f, ensure_ascii=False, indent=2)

print(f"✅ Creato {output_path} con {len(opere)} opere")
print(f"Prime 5 opere:")
for o in opere[:5]:
    print(f"  {o['id']}: {o['artist']} - {o['title']} -> {o['image']}")
