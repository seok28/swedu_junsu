# Google Sheets DB 연동 방법

현재 웹페이지는 아래 구조로 구글 시트를 DB처럼 사용할 수 있습니다.

```text
GitHub Pages
→ Google Apps Script 웹 앱
→ Google Sheets
```

## 1. 구글 시트 만들기

현재 DB로 사용할 구글 시트:

```text
https://docs.google.com/spreadsheets/d/1aMOq2uZB9CWhtCICTXsd8FARGdhBHgGJkN4B7YEuDdM/edit
```

이 시트 ID는 `google-apps-script/Code.gs`의 `SPREADSHEET_ID`에 이미 입력되어 있습니다.

아래 컬럼은 Apps Script가 자동으로 만들 수 있지만, 직접 만들 경우 1행에 입력합니다.

```text
id | title | category | owner | status | updatedAt | summary | steps | reference
```

`steps`는 여러 줄 입력이 가능합니다.

## 2. Apps Script 만들기

1. 구글 시트 상단 메뉴에서 `확장 프로그램 → Apps Script`를 클릭합니다.
2. 기본 `Code.gs` 내용을 모두 지웁니다.
3. 이 프로젝트의 [google-apps-script/Code.gs](<C:/Users/준수/Documents/Codex/2026-04-25/new-chat-2/google-apps-script/Code.gs>) 내용을 붙여넣습니다.
4. 저장합니다.

## 3. 웹 앱으로 배포

Apps Script 화면에서:

1. 오른쪽 위 `배포 → 새 배포` 클릭
2. 유형 선택에서 `웹 앱` 선택
3. 설정:

```text
실행 사용자: 나
액세스 권한: 모든 사용자
```

4. `배포` 클릭
5. 권한 승인
6. 생성된 웹 앱 URL을 복사합니다.

URL은 보통 아래처럼 생겼습니다.

```text
https://script.google.com/macros/s/AKfycb.../exec
```

## 4. config.js에 Apps Script URL 넣기

[config.js](<C:/Users/준수/Documents/Codex/2026-04-25/new-chat-2/config.js>)를 열고 아래 값을 수정합니다.

```js
window.manualAppConfig = {
  googleAppsScriptUrl: "여기에_웹앱_URL_붙여넣기",
  adminKey: "",
};
```

수정 후 GitHub에 `config.js`, `app.js`, `index.html`, `google-apps-script/Code.gs`를 업로드/커밋합니다.

## 5. 수정 후 재배포 주의사항

Apps Script 코드를 수정한 경우에는 반드시 다시 배포해야 합니다.

```text
배포 → 배포 관리 → 수정 → 새 버전 → 배포
```

## 관리자 키

`google-apps-script/Code.gs`의 `ADMIN_KEY`와 `config.js`의 `adminKey`를 같은 값으로 넣으면 추가/수정/삭제 요청에 확인값을 붙일 수 있습니다.

단, GitHub Pages와 공개 저장소에서는 `config.js` 내용이 외부에 보일 수 있으므로 진짜 비밀번호처럼 안전하지 않습니다. 공개 페이지에서는 간단한 실수 방지 정도로만 사용하세요.

## 현재 지원 기능

- 구글 시트에서 매뉴얼 목록 불러오기
- 매뉴얼 추가
- 매뉴얼 수정
- 매뉴얼 삭제
- DB URL이 없으면 기존 브라우저 저장 방식으로 자동 fallback
