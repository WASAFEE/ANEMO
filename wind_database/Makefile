DOCKER_COMPOSE := docker-compose -f docker-compose.yml
TARGET         := postgresql

help: ## ヘルプを表示
	@awk -F: '/^[A-Za-z0-9_-]+:.*## / { sub(/.*## /, "", $$2); printf "make %-15s %s\n", $$1, $$2 }' Makefile

build: ## ローカル環境用のコンテナをビルド
	${DOCKER_COMPOSE} build

ps: ## 実行中のコンテナを表示
	${DOCKER_COMPOSE} ps

logs:             ## コンテナのログを表示します
	$(DOCKER_COMPOSE) logs

logs-f:           ## コンテナのログを表示し続けます
	$(DOCKER_COMPOSE) logs -f

flyway_migrate_all: ## 全てのマイグレーションを実行
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/postgres -mixed="true" -locations="filesystem:/flyway/sql/core" migrate
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -locations="filesystem:/flyway/sql/windanalysisdb" migrate

flyway_migrate_core: ## create database を実行
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -mixed="true" -url=jdbc:postgresql://$(TARGET)/postgres -locations="filesystem:/flyway/sql/core" migrate

flyway_migrate_windanalysisdb: ## windanalysisdb マイグレーションを実行
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -locations="filesystem:/flyway/sql/windanalysisdb" migrate

flyway_migrate_testdata_all: ## 全てのテストデータマイグレーションを実行
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -locations="filesystem:/flyway/sql/windanalysisdb,filesystem:/flyway/sql/testdata/windanalysisdb" migrate

flyway_migrate_testdata_windanalysisdb: ## windanalysisdb テストデータマイグレーションを実行
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -locations="filesystem:/flyway/sql/windanalysisdb,filesystem:/flyway/sql/testdata/windanalysisdb" migrate

flyway_repair_core: ## core マイグレーションを修復
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/postgres -mixed="true" -locations="filesystem:/flyway/sql/core" repair

flyway_repair_windanalysisdb: ## windanalysisdb マイグレーションを修復
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -locations="filesystem:/flyway/sql/windanalysisdb" repair

flyway_repair_testdata_windanalysisdb: ## windanalysisdb テストデータマイグレーションを修復
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -mixed="true" -locations="filesystem:/flyway/sql/windanalysisdb,filesystem:/flyway/sql/testdata/windanalysisdb" repair

flyway_info_windanalysisdb: ## windanalysisdb マイグレーション状況を表示
	$(DOCKER_COMPOSE) run --rm windanalysis_db_migration -url=jdbc:postgresql://$(TARGET)/windanalysisdb -locations="filesystem:/flyway/sql/windanalysisdb" info

.PHONY: build ps logs logs-f flyway_migrate_all flyway_migrate_core flyway_migrate_windanalysisdb flyway_migrate_testdata_all flyway_migrate_testdata_windanalysisdb flyway_repair_core flyway_repair_windanalysisdb flyway_repair_testdata_windanalysisdb flyway_info_windanalysisdb