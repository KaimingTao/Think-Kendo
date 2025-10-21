ready:
	python ./app/data/md2yaml_card.py  ./notes/Ready ./app/data/cards.yaml
	python ./app/data/yaml2json.py -i ./app/data/cards.yaml
dev:
	cd app; npm run dev
