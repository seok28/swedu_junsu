# 배포 안내

현재 프로젝트는 빌드 과정이 필요 없는 정적 웹페이지입니다.

## 파일 구조

```text
index.html
assets/
  styles.css
  app.js
  auth.js
  manual.js
  ladder.js
config.js
data.js
google-apps-script/
  Code.gs
.github/workflows/
  deploy.yml
```

- `index.html`: 화면 구조와 외부 파일 연결
- `assets/styles.css`: 전체 UI 스타일과 반응형 레이아웃
- `assets/app.js`: 페이지 전환, 초기 실행, 공통 유틸 연결
- `assets/auth.js`: 로그인, 로그아웃, 인증 유지
- `assets/manual.js`: 업무 매뉴얼 화면, 구글시트 CRUD
- `assets/ladder.js`: 사다리게임 화면과 게임 로직
- `config.js`: 구글시트 Apps Script URL, 비밀번호 등 설정
- `data.js`: 구글시트 연결 실패 시 사용할 기본 매뉴얼 데이터
- `google-apps-script/Code.gs`: 구글시트 CRUD용 Apps Script 코드
- `.github/workflows/deploy.yml`: GitHub Pages 자동 배포 설정

## GitHub Pages 배포

현재 배포 방식은 GitHub Actions를 사용합니다.

GitHub 저장소에서 아래 설정을 확인하세요.

1. Repository `Settings`
2. `Pages`
3. `Build and deployment`
4. Source를 `GitHub Actions`로 선택

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 저장소 파일을 그대로 GitHub Pages에 배포합니다.

## 로컬 확인

파일을 직접 열어도 동작하지만, `config.js`, `data.js`, `assets/*.js` 경로 확인을 위해 간단한 로컬 서버로 보는 것을 권장합니다.

```bash
python3 -m http.server 8000
```

이후 아래 주소로 접속합니다.

```text
http://localhost:8000/
```

## 업로드 시 필요한 파일

최소 실행 파일:

```text
index.html
assets/styles.css
assets/app.js
assets/auth.js
assets/manual.js
assets/ladder.js
config.js
data.js
```

구글시트 연동 유지 파일:

```text
google-apps-script/Code.gs
GOOGLE_SHEETS_SETUP.md
```

자동 배포 유지 파일:

```text
.github/workflows/deploy.yml
```
