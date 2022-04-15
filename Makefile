define find_updated_sources
$(shell find -type f ! -path "*.marker" ! -path '*/node_modules/*' -printf "%T+ %p\n" | sort | tail -1 | cut -d ' ' -f2)
endef

help: ## Display help text
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) /dev/null | \
		sed 's/^[^:]*://' | sort | \
		awk -F':.*?## ' '{printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: run
run: ## Runs the development server
	docker run --rm -it --workdir /app -v $$(pwd):/app node:14 npm install
	docker run --rm -it --workdir /app -p 3000:3000 -v $$(pwd):/app node:14 npm start

.PHONY: bash
bash: image.marker ## Opens a bash environment for development
	docker run --rm -it -v $$(pwd):/app talespire-generator bash

.PHONY: release-test
release-test: image.marker ## Runs test suite
	docker run --rm -it talespire-generator npm run eslint
	docker run --rm -it talespire-generator npm run test
	docker run --rm -it talespire-generator npm run build

image.marker: $(call find_updated_sources)
	docker build --rm --tag talespire-generator .
	touch image.marker
