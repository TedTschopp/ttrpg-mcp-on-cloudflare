.PHONY: build
build:
	bundle exec jekyll build
	python3 scripts/site_analytics.py _site --mode standard
	python3 scripts/site_analytics.py _site --mode standard --check
