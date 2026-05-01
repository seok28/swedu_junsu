# 배포 안내

이 페이지는 정적 웹페이지라서 서버 프로그램 없이 배포할 수 있습니다.

## 파일 구조

```text
index.html
styles.css
data.js
config.js
app.js
```

- `index.html`: 화면 구조
- `styles.css`: 디자인
- `data.js`: 기본 메뉴, 담당 부서, 기본 매뉴얼 데이터
- `config.js`: Google Apps Script API URL 설정
- `app.js`: 검색, 추가, 수정, 삭제 등 화면 동작

## 외부 공개 방법

GitHub Pages, Netlify, Vercel 같은 정적 사이트 호스팅에 위 파일을 그대로 올리면 됩니다.

## 데이터 관리 방식

현재는 DB 없이 동작합니다.

- 외부 사용자가 처음 접속하면 `data.js`의 기본 매뉴얼을 봅니다.
- 사용자가 화면에서 추가/수정/삭제한 내용은 그 사람의 브라우저 `localStorage`에만 저장됩니다.
- 여러 사람이 같은 데이터를 함께 수정하려면 나중에 DB를 연결해야 합니다.

`config.js`에 Google Apps Script 웹 앱 URL을 넣으면 구글 시트를 DB처럼 사용합니다. 자세한 설정은 `GOOGLE_SHEETS_SETUP.md`를 확인하세요.

## 기본 매뉴얼 수정

공통으로 보일 기본 매뉴얼을 바꾸려면 `data.js`의 `manuals` 배열을 수정하면 됩니다.

```js
{
  id: "unique-id",
  title: "매뉴얼 제목",
  category: "cmcs",
  owner: "AI/SW교육지원팀",
  updatedAt: "2026-04-25",
  status: "정상",
  summary: "간단한 설명",
  steps: ["1단계", "2단계"],
  reference: "참고 위치"
}
```

사용 가능한 `category` 값:

- `cmcs`: CM/CS프로젝트
- `performance`: 성과확산
- `equipment`: 기자재/시설
- `etc`: 일반행정
- `personalAdmin`: 개인행정
