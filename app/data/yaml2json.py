#!/usr/bin/env python3
"""Convert card data from YAML to the JSON format used by the idea card grid."""

import argparse
import json
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError as exc:  # pragma: no cover - defensive dependency guard
    raise SystemExit(
        'PyYAML is required to run this script. Install it with "pip install pyyaml".'
    ) from exc


def normalize_tags(raw_value, delimiter):
    if raw_value is None:
        return []

    if isinstance(raw_value, str):
        candidate = raw_value.strip()
        if not candidate:
            return []
        values = [part.strip().capitalize() for part in candidate.split(delimiter)]
    elif isinstance(raw_value, (list, tuple)):
        values = []
        for item in raw_value:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                values.append(text.capitalize())
    else:
        raise TypeError('Expected "tags" to be a string or list')

    return [value for value in values if value]


def normalize_details(raw_value):
    if raw_value is None:
        return ''

    if isinstance(raw_value, (list, tuple)):
        normalized = []
        for item in raw_value:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                normalized.append(text)
        return normalized

    return str(raw_value).strip()


def build_image_payload(raw_card):
    image = raw_card.get('image')
    if not image:
        return None
    if not isinstance(image, dict):
        raise TypeError('Expected "image" to be a mapping with "src"/"alt" keys')

    src = str(image.get('src') or '').strip()
    alt = str(image.get('alt') or '').strip()
    if not src:
        return None
    payload = {'src': src}
    if alt:
        payload['alt'] = alt
    return payload


def convert_yaml_to_json(yaml_path, tag_delimiter):
    json_path = yaml_path.parent / f"{yaml_path.stem}.json"
    if not yaml_path.exists():
        raise FileNotFoundError(f'YAML source not found: {yaml_path}')

    with yaml_path.open('r', encoding='utf-8') as handle:
        data = yaml.safe_load(handle) or []

    if not isinstance(data, list):
        raise ValueError('The YAML root must be a list of cards')

    cards = []
    for index, raw_card in enumerate(data, start=1):
        if not isinstance(raw_card, dict):
            raise ValueError(f'Card {index} is not a mapping')

        title = str(raw_card.get('title') or '').strip()
        if not title:
            print(raw_card)
            raise ValueError(f'Missing "title" in card {index}')

        details = normalize_details(raw_card.get('details'))

        card = {
            'title': title,
            'details': details,
            'tags': normalize_tags(raw_card.get('tags'), tag_delimiter),
        }
        if not card['tags']:
            print(card['title'], '| no tags')

        summary = str(raw_card.get('summary') or '').strip()
        if summary:
            card['summary'] = summary

        image_payload = build_image_payload(raw_card)
        if image_payload:
            card['image'] = image_payload

        cards.append(card)

    json_path.parent.mkdir(parents=True, exist_ok=True)
    with json_path.open('w', encoding='utf-8') as handle:
        json.dump(cards, handle, indent=2, ensure_ascii=False)
        handle.write('\n')


def main():
    parser = argparse.ArgumentParser(description='Generate data/cards.json from a YAML source file.')
    parser.add_argument(
        '-i',
        '--input',
        default='cards.yaml',
        type=Path,
        help='Path to the source YAML (default: data/cards.yaml)',
    )
    parser.add_argument(
        '-t',
        '--tag-delimiter',
        default=',',
        help='Delimiter used inside the tags column (default: ",")',
    )

    args = parser.parse_args()

    convert_yaml_to_json(args.input, tag_delimiter=args.tag_delimiter)


if __name__ == '__main__':
    main()
