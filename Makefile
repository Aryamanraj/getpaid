SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help install redis-up redis-down build shared api web dev-api dev-web \
        migrate migrate-rollback aes-key check test lint format clean \
        dev-db-up prod-up prod-migrate prod-logs deploy-nginx logs-nginx

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install all workspace dependencies
	yarn install

redis-up: ## Start Redis in Docker
	docker compose up -d redis

redis-down: ## Stop Redis
	docker compose down

dev-db-up: ## Start Redis + a local Postgres for development
	docker compose --profile dev up -d

prod-up: ## Build and start the production stack
	docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d --build

prod-migrate: ## Run migrations + seeds inside the production api container
	docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod exec api node dist/src/db/migrate

prod-logs: ## Tail production logs
	docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod logs -f --tail=100

deploy-nginx: ## Deploy the nginx-fronted stack: pull CI images, migrate, start
	bash deploy/deploy.sh

deploy-nginx-build: ## Same, but build images on this machine (no-CI fallback)
	bash deploy/deploy.sh --build

logs-nginx: ## Tail logs of the nginx-fronted stack
	docker compose -f docker-compose.prod.yml -f deploy/docker-compose.nginx.yml --env-file deploy/.env.prod logs -f --tail=100

shared: ## Build the shared package
	yarn shared build

api: shared ## Build the API
	yarn api build

web: shared ## Build the web app
	yarn web build

build: shared api web ## Build everything

dev-api: shared ## Run the API in watch mode
	yarn api start:dev

dev-web: shared ## Run the web app in dev mode
	yarn web dev

migrate: ## Apply pending migrations, then pending seeds
	yarn api migrate

migrate-rollback: ## Roll back the last applied migration
	yarn api migrate:rollback

aes-key: ## Generate an AES_ENCRYPTION_KEY (64-char hex)
	@openssl rand -hex 32

check: ## Typecheck both apps
	cd apps/api && npx tsc -p tsconfig.json --noEmit
	cd apps/web && npx tsc --noEmit

test: shared ## Run unit tests
	yarn api test

lint: ## Lint with biome
	yarn biome:ci

format: ## Format and autofix with biome
	yarn biome

clean: ## Remove build output
	rm -rf apps/api/dist apps/web/.next packages/shared/dist
