# 기본 Node.js 이미지 선택 (프로젝트의 Node.js 버전에 맞춰 조정)
# package.json을 확인하여 정확한 Node 버전 명시 권장 (예: node:18.17.0-alpine)
FROM node:18-alpine

# 작업 디렉터리 설정
WORKDIR /usr/src/app

# package.json 및 package-lock.json (또는 yarn.lock 등) 복사
# 의존성 정의 파일들이 변경될 때만 아래 레이어가 재빌드되도록 함
COPY package*.json ./

# 의존성 설치
# npm ci는 package-lock.json을 사용하여 더 예측 가능한 빌드를 제공합니다.
# 운영 환경에서는 개발 의존성을 설치하지 않도록 --omit=dev (npm >7) 또는 --production (npm <7) 사용 가능
RUN npm ci --omit=dev

# 소스 코드 복사
# .dockerignore 파일을 사용하여 불필요한 파일(node_modules, .git 등) 복사 방지
COPY . .

# 애플리케이션 빌드 (package.json의 "build" 스크립트 실행)
RUN npm run build

# 애플리케이션이 노출할 포트 (필요한 경우, HTTP 서버의 경우)
# 현재는 STDIO 서버이므로 직접적인 포트 노출은 없지만, 향후 HTTP 마이그레이션 시 필요할 수 있음
# EXPOSE 3000

# 컨테이너 시작 시 실행될 명령어
# smithery.yaml의 commandFunction에서 정의한 것과 일치해야 함
# 환경 변수는 Smithery에서 주입
CMD [ "node", "build/index.js" ] 