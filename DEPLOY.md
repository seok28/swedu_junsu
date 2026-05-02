# 배포 안내

현재 프로젝트는 React + TypeScript + Vite 앱입니다. GitHub Pages에 배포할 때는 원본 파일을 그대로 올리는 방식이 아니라, 빌드 결과물인 `dist` 폴더를 배포해야 합니다.

## 로컬 실행

Node.js와 npm이 설치된 환경에서 실행합니다.

```bash
npm install
npm run dev
```

## 빌드 확인

```bash
npm run build
```

빌드가 성공하면 `dist` 폴더가 생성됩니다.

## GitHub Pages 배포

이 저장소에는 GitHub Actions 배포 파일이 포함되어 있습니다.

```text
.github/workflows/deploy.yml
```

`main` 브랜치에 push하면 자동으로 다음 작업을 수행합니다.

1. `npm install`
2. `npm run build`
3. `dist` 폴더를 GitHub Pages에 배포

## GitHub 설정 필요 사항

GitHub 저장소에서 아래 설정을 확인하세요.

1. Repository `Settings`
2. `Pages`
3. `Build and deployment`
4. Source를 `GitHub Actions`로 선택

현재 배포 주소가 아래와 같기 때문에 Vite의 `base`는 `/swedu_junsu/`로 설정되어 있습니다.

```text
https://seok28.github.io/swedu_junsu/
```

## 주의 사항

`file:///.../index.html`로 직접 열면 React/Vite 앱이 정상 동작하지 않을 수 있습니다. 개발 중에는 `npm run dev`, 배포 시에는 GitHub Actions 또는 `npm run build` 결과물을 사용하세요.
