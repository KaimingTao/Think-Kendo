import yaml
from pathlib import Path
from datetime import datetime


class LiteralString(str):
    pass


def literal_str_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


yaml.add_representer(LiteralString, literal_str_representer)


def md2yaml_card(file_path):
    cards = []
    with open(file_path) as fd:
        card = []
        for row in fd.readlines():
            row = row.strip()
            if not row:
                continue
            if row.startswith("##") and card:
                cards.append(card)
                card = [row]
            else:
                card.append(row)

        if card:
            cards.append(card)

    for i in range(len(cards)):
        card = cards[i]
        title = card[0].replace("##", "").strip()
        tags = []
        if "tags:" in card[-1]:
            tags = card[-1].replace("tags:", "").strip().split(",")
            tags = [t.strip() for t in tags if t.strip()]
            details = card[1:-1]
        else:
            details = card[1:]

        details = "\n".join(details)
        new_card = {"title": title}
        if details:
            new_card["details"] = LiteralString(details)
        if tags:
            new_card["tags"] = tags

        cards[i] = new_card

    return cards


def main(folder, save_file=None):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if not save_file:
        save_file = folder.parent / f"new_cards-{timestamp}.yaml"

    cards = []
    for file in folder.iterdir():
        if file.suffix != ".md":
            continue
        print(file)
        cards.extend(md2yaml_card(file))

    with open(save_file, "w") as f:
        yaml.dump(
            cards,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            indent=2,
        )


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 3:
        save_file = Path(sys.argv[2]).expanduser().resolve()
    else:
        save_file = None

    main(Path(sys.argv[1]).expanduser().resolve(), save_file)
