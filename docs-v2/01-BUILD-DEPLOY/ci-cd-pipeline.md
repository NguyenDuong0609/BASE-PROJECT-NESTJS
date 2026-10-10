# CI/CD Pipeline

Hướng dẫn thiết lập và sử dụng pipeline CI/CD cho tự động hóa build, test và deploy.

## Tổng quan

Pipeline tự động hóa:

1. **Lint & Type check** - Kiểm tra code quality
2. **Unit tests** - Test logic nghiệp vụ
3. **E2E tests** - Test integration
4. **Security audit** - Kiểm tra dependency
5. **Build Docker image** - Build production image
6. **Deploy** - Deploy đến staging/production

## GitLab CI Example

### File: .gitlab-ci.yml

```yaml
stages:
  - test
  - build
  - deploy-staging
  - deploy-production

variables:
  NODE_VERSION: "24"
  DOCKER_TLS_CERTDIR: "/certs"
  DOCKER_DRIVER: overlay2

# Stage: Test
test:lint:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run lint
  only:
    - merge_requests
    - main
    - develop

test:unit:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm test -- --runInBand --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  only:
    - merge_requests
    - main
    - develop

test:e2e:
  stage: test
  image: node:${NODE_VERSION}
  services:
    - postgres:15-alpine
    - redis:7-alpine
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
    POSTGRES_HOST: postgres
    REDIS_HOST: redis
  script:
    - npm ci
    - npm run migration:run
    - npm run test:e2e -- --runInBand
  only:
    - merge_requests
    - main
    - develop

test:audit:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm audit --audit-level=moderate
  allow_failure: true
  only:
    - merge_requests
    - main
    - develop

# Stage: Build
build:image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
    - develop

# Stage: Deploy Staging
deploy:staging:
  stage: deploy-staging
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$DEPLOY_SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - echo "$DEPLOY_SSH_KNOWN_HOSTS" >> ~/.ssh/known_hosts
    - chmod 644 ~/.ssh/known_hosts
  script:
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && APP_IMAGE=$CI_REGISTRY_IMAGE APP_VERSION=$CI_COMMIT_SHA docker compose --env-file .env.staging -f docker-compose.prod.yml up -d --build"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml exec -T api npm run migration:run"
  environment:
    name: staging
    url: https://staging.yourdomain.com
  when: manual
  only:
    - develop

# Stage: Deploy Production
deploy:production:
  stage: deploy-production
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$DEPLOY_SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - echo "$DEPLOY_SSH_KNOWN_HOSTS" >> ~/.ssh/known_hosts
    - chmod 644 ~/.ssh/known_hosts
  script:
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && APP_IMAGE=$CI_REGISTRY_IMAGE APP_VERSION=$CI_COMMIT_SHA docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"
    - ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml exec -T api npm run migration:run"
  environment:
    name: production
    url: https://yourdomain.com
  when: manual
  only:
    - main
```

## GitHub Actions Example

### File: .github/workflows/ci-cd.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [24.x]
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test -- --runInBand --coverage

      - name: E2E tests
        run: |
          docker-compose -f docker-compose.dev.yml up -d postgres_db redis
          npm run migration:run
          npm run test:e2e -- --runInBand
          docker-compose -f docker-compose.dev.yml down

      - name: Security audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.DOCKER_REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_REGISTRY }}/nestjs-base:${{ github.sha }}
            ${{ secrets.DOCKER_REGISTRY }}/nestjs-base:latest
          cache-from: type=registry,ref=${{ secrets.DOCKER_REGISTRY }}/nestjs-base:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_REGISTRY }}/nestjs-base:buildcache,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.yourdomain.com
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd ${{ secrets.DEPLOY_PATH }}
            docker pull ${{ secrets.DOCKER_REGISTRY }}/nestjs-base:${{ github.sha }}
            APP_IMAGE=${{ secrets.DOCKER_REGISTRY }}/nestjs-base APP_VERSION=${{ github.sha }} docker compose --env-file .env.staging -f docker-compose.prod.yml up -d --build

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://yourdomain.com
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd ${{ secrets.DEPLOY_PATH }}
            docker pull ${{ secrets.DOCKER_REGISTRY }}/nestjs-base:${{ github.sha }}
            APP_IMAGE=${{ secrets.DOCKER_REGISTRY }}/nestjs-base APP_VERSION=${{ github.sha }} docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## Environment Variables

### GitLab CI Variables

| Variable | Type | Protected | Description |
|----------|------|-----------|-------------|
| `CI_REGISTRY` | Variable | No | Docker registry URL |
| `CI_REGISTRY_USER` | Variable | No | Registry username |
| `CI_REGISTRY_PASSWORD` | Variable | Yes | Registry password |
| `DEPLOY_HOST` | Variable | No | Deploy server hostname |
| `DEPLOY_USER` | Variable | No | SSH username |
| `DEPLOY_PATH` | Variable | No | Path on deploy server |
| `DEPLOY_SSH_PRIVATE_KEY` | File | Yes | SSH private key |
| `DEPLOY_SSH_KNOWN_HOSTS` | File | Yes | SSH known hosts |

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_REGISTRY` | Docker registry URL |
| `DOCKER_USERNAME` | Registry username |
| `DOCKER_PASSWORD` | Registry password |
| `DEPLOY_HOST` | Deploy server hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key |
| `DEPLOY_PATH` | Path on deploy server |

## Branch Strategy

### Main Branch

- Môi trường: Production
- Deploy: Manual approval
- Branch protection: Required
- Code review: Required

### Develop Branch

- Môi trường: Staging
- Deploy: Manual approval
- Branch protection: Required
- Code review: Required

### Feature Branches

- Môi trường: None
- Deploy: None
- Merge: Via Pull Request

## Best Practices

### 1. Fast builds

```yaml
# Use npm cache
- uses: actions/setup-node@v4
  with:
    cache: 'npm'

# Use Docker cache
cache-from: type=registry,ref=registry/image:buildcache
cache-to: type=registry,ref=registry/image:buildcache,mode=max
```

### 2. Parallel tests

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
  fail-fast: false
```

### 3. Artifact caching

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 4. Security scanning

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ secrets.DOCKER_REGISTRY }}/nestjs-base:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### 5. Notifications

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: rtCamp/action-slack-notify@v2
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

## Rollback Strategy

### Manual rollback

```bash
# SSH vào server
ssh user@server

# Pull previous version
docker pull registry/image:<previous-sha>

# Redeploy
APP_VERSION=<previous-sha> docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

### Automated rollback

```yaml
deploy:production:
  # ... deploy steps
  on_failure:
    - name: Rollback
      run: |
        ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && APP_VERSION=$PREVIOUS_VERSION docker compose --env-file .env.prod -f docker-compose.prod.yml up -d"
```

## Monitoring Pipeline

### Add health check after deploy

```yaml
- name: Health check
  run: |
    for i in {1..30}; do
      if curl -f https://yourdomain.com/health/ready; then
        echo "Health check passed"
        exit 0
      fi
      echo "Waiting for health check... ($i/30)"
      sleep 10
    done
    echo "Health check failed"
    exit 1
```

## Troubleshooting

### Pipeline fails on test

1. Check test logs
2. Run tests locally
3. Check environment variables
4. Verify dependencies

### Pipeline fails on build

1. Check Docker logs
2. Verify Dockerfile syntax
3. Check build context
4. Verify registry access

### Pipeline fails on deploy

1. Check SSH connection
2. Verify server access
3. Check environment file
4. Verify Docker on server

## Tài liệu liên quan

- [Local Development](local-development.md)
- [Docker Setup](docker-setup.md)
- [Production Deploy](production-deploy.md)
