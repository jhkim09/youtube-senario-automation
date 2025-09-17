# YouTube 시나리오 생성 API 사용법

## 웹훅 엔드포인트
```
POST https://youtube-senario-automation.onrender.com/webhook/make
```

## 요청 예시

### 1. 전체 옵션 포함
```json
{
  "topic": "AI 시대의 프로그래밍 입문",
  "materials": [
    "ChatGPT 활용법",
    "GitHub Copilot 소개",
    "Python 기초 문법"
  ],
  "keywords": [
    "AI",
    "프로그래밍",
    "코딩",
    "자동화",
    "Python"
  ],
  "references": [
    "https://docs.python.org",
    "OpenAI 공식 문서"
  ],
  "tone": "informative",
  "length": "medium",
  "targetAudience": "beginner",
  "videoType": "educational",
  "shouldSaveToAirtable": true
}
```

### 2. 최소 요청 (필수 항목만)
```json
{
  "topic": "5분 만에 배우는 엑셀 단축키",
  "shouldSaveToAirtable": true
}
```

### 3. Airtable 저장 없이 시나리오만 생성
```json
{
  "topic": "유튜브 썸네일 만들기",
  "materials": ["포토샵", "캔바"],
  "shouldSaveToAirtable": false
}
```

## 파라미터 설명

### 필수 파라미터
- `topic` (string): 영상 주제

### 선택 파라미터
- `materials` (array): 사용할 소재/콘텐츠 목록
- `keywords` (array): 키워드 목록
- `references` (array): 참고 자료 URL 목록
- `tone` (string): 톤 설정
  - `"informative"`: 정보 전달형 (기본값)
  - `"casual"`: 캐주얼한
  - `"professional"`: 전문적인
  - `"humorous"`: 유머러스한
- `length` (string): 영상 길이
  - `"short"`: 5분 이하
  - `"medium"`: 5-10분 (기본값)
  - `"long"`: 10분 이상
- `targetAudience` (string): 타겟 시청자
  - `"general"`: 일반 (기본값)
  - `"beginner"`: 초보자
  - `"intermediate"`: 중급자
  - `"expert"`: 전문가
- `videoType` (string): 영상 유형
  - `"educational"`: 교육 (기본값)
  - `"entertainment"`: 엔터테인먼트
  - `"review"`: 리뷰
  - `"tutorial"`: 튜토리얼
  - `"vlog"`: 브이로그
- `shouldSaveToAirtable` (boolean): Airtable 자동 저장 여부
  - `true`: 서버에서 직접 Airtable에 저장
  - `false`: 시나리오만 생성 (기본값)

## 응답 예시

### 성공 응답
```json
{
  "success": true,
  "data": {
    "title": "AI 프로그래밍의 시작: ChatGPT와 함께하는 코딩 입문",
    "thumbnail": "썸네일 아이디어 설명...",
    "intro": "인트로 스크립트...",
    "mainContent": "메인 콘텐츠 스크립트...",
    "conclusion": "결론 스크립트...",
    "description": "영상 설명...",
    "tags": ["AI", "프로그래밍", "ChatGPT"],
    "generatedAt": "2024-01-17T12:00:00.000Z",
    "topic": "AI 시대의 프로그래밍 입문",
    "airtableId": "recXXXXXXXXXXXXXX"  // Airtable 저장 시에만 포함
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": "주제(topic)는 필수입니다."
}
```

## cURL 테스트 명령어

### Windows (PowerShell)
```powershell
curl -X POST https://youtube-senario-automation.onrender.com/webhook/make `
  -H "Content-Type: application/json" `
  -d @example-webhook-request.json
```

### Mac/Linux
```bash
curl -X POST https://youtube-senario-automation.onrender.com/webhook/make \
  -H "Content-Type: application/json" \
  -d @example-webhook-request.json
```

### 간단한 테스트
```bash
curl -X POST https://youtube-senario-automation.onrender.com/webhook/make \
  -H "Content-Type: application/json" \
  -d '{"topic":"테스트 주제","shouldSaveToAirtable":true}'
```

## Make.com 설정

1. HTTP Request 모듈 추가
2. Method: POST
3. URL: `https://youtube-senario-automation.onrender.com/webhook/make`
4. Headers: `Content-Type: application/json`
5. Body: 위의 JSON 예시 참조

## 환경 변수 확인 (디버그용)

```bash
curl https://youtube-senario-automation.onrender.com/api/debug/env
```

응답:
```json
{
  "hasOpenAI": true,
  "hasAirtableKey": true,
  "hasAirtableBase": true,
  "airtableTable": "youtube",
  "airtableBaseId": "app0nk..."
}
```