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


class LiteralString(str):
    pass


def literal_str_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


yaml.add_representer(LiteralString, literal_str_representer)


def reformat_yaml(yaml_path):
    if not yaml_path.exists():
        raise FileNotFoundError(f"YAML source not found: {yaml_path}")

    with yaml_path.open("r", encoding="utf-8") as handle:
        cards = yaml.safe_load(handle) or []

    [
        c.update({"details": LiteralString(c["details"])})
        for c in cards
        if c.get("details")
    ]

    print('# Cards', len(cards))
    if not isinstance(cards, list):
        raise ValueError("The YAML root must be a list of cards")

    with open(yaml_path, "w") as f:
        yaml.dump(
            cards,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            indent=2,
            width=float("inf")
        )


def main():
    parser = argparse.ArgumentParser(
        description="Generate data/cards.json from a YAML source file."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="cards.yaml",
        type=Path,
        help="Path to the source YAML (default: data/cards.yaml)",
    )

    args = parser.parse_args()

    reformat_yaml(args.input)


if __name__ == "__main__":
    main()
