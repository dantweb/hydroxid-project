.PHONY: install build local down logs test e2e check

install: ## dependencies (the private packages come over git+ssh)
	npm ci

build: ## themes, app, rendered instance configs, nginx configs
	npm run build

local: build ## build, then http://localhost:8101 (vibrant) :8102 (dark-ocean) :8103 (light-red)
	docker compose up -d --force-recreate
	@echo "vibrant      http://localhost:8101"
	@echo "dark-ocean   http://localhost:8102"
	@echo "light-red    http://localhost:8103"

down:
	docker compose down

logs:
	docker compose logs -f hydroxid

test: ## unit tests
	npm test

e2e: build ## e2e per instance against `vite preview`, shop API mocked
	for i in vibrant dark-ocean light-red; do INSTANCE=$$i npx playwright test --project=chromium || exit 1; done

check: ## the CI quality gate
	npm run lint && npm run type-check && npm run knip && npm test && npm audit
