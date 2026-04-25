# swedu_junsu

회사 업무 매뉴얼 홈페이지를 빠르게 시작하기 위한 **단일 페이지 템플릿**입니다.

## 포함 기능
- 부서별 필터 + 키워드 검색
- 다크모드 토글(브라우저 저장)
- 인쇄/PDF 출력 버튼
- 운영 현황 카드, FAQ, 공지 섹션

## 파일 구성
- `index.html` : 매뉴얼 포털 구조
- `styles.css` : 반응형/테마 UI 스타일
- `script.js` : 검색/필터/테마/인쇄 인터랙션
- `.github/workflows/deploy-pages.yml` : GitHub Pages 자동 배포 워크플로우

## 실행 방법
1. 저장소를 내려받습니다.
2. `index.html` 파일을 브라우저에서 열면 바로 동작합니다.

## GitHub 저장소 적용 방법
1. 원격 저장소 연결
   ```bash
   git remote add origin <YOUR_GITHUB_REPO_URL>
   ```
2. 기본 브랜치 푸시
   ```bash
   git push -u origin main
   ```
   > 기본 브랜치가 `master`인 경우 `git push -u origin master`

3. GitHub Pages 활성화
   - GitHub 저장소 > **Settings > Pages**
   - **Build and deployment** 를 **GitHub Actions** 로 선택

4. 배포 완료 후 접속
   - `https://<계정명>.github.io/<저장소명>/`

## 커스터마이징 포인트
- 매뉴얼 카드 추가: `#manualList` 안에 `.manual-item` 섹션 복제
- 검색 강화: 각 카드의 `data-keywords` 확장
- 부서 추가: 사이드바 `data-dept` 버튼 + 카드 `data-dept` 값 동기화
