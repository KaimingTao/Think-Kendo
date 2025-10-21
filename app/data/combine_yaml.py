import yaml
import glob
import sys
from pathlib import Path


class LiteralString(str):
    pass


def literal_str_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


yaml.add_representer(LiteralString, literal_str_representer)


def combine_yaml(input_dir, output_file):
    combined_data = []

    for file_path in input_dir.iterdir():

        if file_path.suffix != ".yaml":
            continue
        print(file_path)

        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            combined_data.extend(data)

    for i in combined_data:
        if not i.get('details'):
            continue

        i.update({'details': LiteralString(i['details'])})


    print("#cards:", len(combined_data))
    with open(output_file, "w", encoding="utf-8") as f:
        yaml.dump(
            combined_data,
            f,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            indent=2,
            width=float("inf")
        )

    print(f"Combined YAML saved to: {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python combine_yaml.py <input_folder> <output_file>")
        sys.exit(1)

    input_dir = Path(sys.argv[1])
    output_file = Path(sys.argv[2])
    combine_yaml(input_dir, output_file)
