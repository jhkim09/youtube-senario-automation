# Make.com 자동화 설정 가이드

## 1. 서버 실행

먼저 로컬 서버를 실행하거나 클라우드에 배포합니다:

```bash
# 로컬 실행
npm run server

# 또는 개발 모드 (자동 재시작)
npm run dev-server
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 2. ngrok으로 로컬 서버 공개 (로컬 테스트용)

Make.com에서 로컬 서버에 접속하려면 ngrok을 사용:

```bash
# ngrok 설치 (https://ngrok.com/)
ngrok http 3000
```

ngrok이 제공하는 URL (예: `https://abc123.ngrok.io`)을 Make.com에서 사용합니다.

## 3. Make.com 시나리오 설정

### 시나리오 1: 주기적으로 시나리오 생성

1. **트리거**: Schedule (매일 특정 시간)
2. **HTTP Request 모듈**:
   - URL: `https://your-server.com/webhook/make`
   - Method: POST
   - Headers:
     - Content-Type: `application/json`
   - Body:
     ```json
     {
       "topic": "{{topic}}",
       "materials": "소재1,소재2,소재3",
       "keywords": "키워드1,키워드2",
       "references": "참고자료1,참고자료2",
       "tone": "informative",
       "length": "medium",
       "targetAudience": "general",
       "videoType": "educational",
       "saveToAirtable": true
     }
     ```

### 시나리오 2: Google Sheets에서 주제 읽기

1. **트리거**: Google Sheets - Watch Rows
2. **HTTP Request 모듈**: 위와 동일
3. **매핑**:
   - topic: `{{1.주제}}`
   - materials: `{{1.소재}}`
   - keywords: `{{1.키워드}}`

### 시나리오 3: Airtable과 연동

1. **트리거**: 원하는 트리거
2. **HTTP Request 모듈**: 시나리오 생성
3. **Airtable 모듈**: Create a Record
   - Base: 선택
   - Table: Scenarios
   - 필드 매핑:
     - Topic: `{{1.data.topic}}`
     - Title: `{{1.data.title}}`
     - Description: `{{1.data.description}}`
     - Tags: `{{1.data.tags}}`

## 4. Airtable 테이블 구조

Airtable에서 다음 필드를 가진 테이블 생성:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Topic | Single line text | 주제 |
| Title | Single line text | 비디오 제목 |
| Thumbnail | Long text | 썸네일 아이디어 |
| Intro | Long text | 인트로 스크립트 |
| Main Content | Long text | 메인 콘텐츠 |
| Conclusion | Long text | 결론 |
| Description | Long text | 비디오 설명 |
| Tags | Single line text | 태그 (쉼표 구분) |
| Generated At | Date & time | 생성 시간 |
| Tone | Single select | 톤 |
| Length | Single select | 길이 |
| Target Audience | Single line text | 대상 청중 |
| Video Type | Single line text | 비디오 유형 |
| Status | Single select | 상태 (Draft/Published/Scheduled) |

## 5. API 키 설정

### Airtable API 키 얻기:
1. [Airtable 계정 설정](https://airtable.com/account)
2. API 섹션에서 Personal access token 생성
3. Scope 설정:
   - `data.records:read`
   - `data.records:write`

### Base ID 찾기:
1. Airtable 베이스 열기
2. Help → API documentation
3. URL에서 Base ID 확인 (app로 시작하는 문자열)

### .env 파일 설정:
```env
OPENAI_API_KEY=sk-xxxxx
AIRTABLE_API_KEY=patxxxxx
AIRTABLE_BASE_ID=appxxxxx
AIRTABLE_TABLE_NAME=Scenarios
PORT=3000
```

## 6. Make.com 웹훅 URL

웹훅 엔드포인트:
- 시나리오 생성: `POST /webhook/make`
- 직접 API 호출: `POST /api/generate-scenario`
- Airtable 저장: `POST /api/save-to-airtable`
- 시나리오 조회: `GET /api/scenarios`

## 7. 응답 형식

성공 응답:
```json
{
  "success": true,
  "data": {
    "title": "생성된 제목",
    "thumbnail": "썸네일 아이디어",
    "intro": "인트로 내용",
    "mainContent": "메인 콘텐츠",
    "conclusion": "결론",
    "description": "설명",
    "tags": ["태그1", "태그2"],
    "generatedAt": "2024-01-15T10:30:00Z",
    "topic": "원본 주제",
    "airtableId": "recxxxxx"
  }
}
```

## 8. 활용 예시

### 매일 아침 9시에 트렌드 주제로 시나리오 생성:
1. Google Trends API에서 트렌드 키워드 수집
2. Make.com으로 시나리오 생성 요청
3. Airtable에 저장
4. Slack으로 알림

### 콘텐츠 캘린더 자동화:
1. Google Calendar에서 주제 읽기
2. 해당 날짜의 시나리오 생성
3. Airtable에 저장
4. 담당자에게 이메일 발송