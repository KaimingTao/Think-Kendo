import yaml
from yaml import FullLoader
from pathlib import Path
from datetime import datetime


def one_file(card_file):
    # print(open(card_file).readlines())

    with open(card_file, "r", encoding="utf-8") as f:
        cards = yaml.safe_load(f)

    save_file = card_file.parent / f"{card_file.stem}.md"

    with open(save_file, "w") as fd:
        for card in cards:
            title = card["title"]
            details = card.get("details", "")
            tags = card.get("tags", [])

            fd.write(f"## {title}\n")
            fd.write("\n")
            if details:
                fd.write(f"{details}\n")
            if tags:
                fd.write(f'tags: {",".join(tags)}\n')

            fd.write('\n---\n')
            fd.write('\n')

    return cards


def main(folder):
    cards = []
    for i in folder.iterdir():
        if i.suffix != ".yaml":
            continue
        cards.extend(one_file(i))

    print("# Cards", len(cards))


if __name__ == "__main__":
    import sys

    main(Path(sys.argv[1]).expanduser().resolve())
