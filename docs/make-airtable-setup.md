# Make.com → Airtable 자동화 설정

## 방법 1: Make.com에서 처리 (권장)

### 시나리오 구성:
1. **HTTP Request** → 시나리오 생성
2. **JSON Parse** → 응답 파싱
3. **Airtable Create Record** → 데이터 저장

### 상세 설정:

#### 1. HTTP Request
```json
{
  "url": "https://youtube-senario-automation.onrender.com/webhook/make",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "topic": "{{topic}}",
    "materials": ["{{material1}}", "{{material2}}"],
    "keywords": ["{{keyword1}}", "{{keyword2}}"],
    "saveToAirtable": false  // Make.com에서 처리
  }
}
```

#### 2. JSON Parse
- JSON string: `{{1.data}}`
- 이렇게 하면 data 객체의 모든 필드에 접근 가능

#### 3. Airtable - Create a Record
- Base: Your Base ID
- Table: Scenarios
- 필드 매핑:

| Airtable 필드 | Make.com 매핑 |
|--------------|---------------|
| Topic | `{{2.data.topic}}` |
| Title | `{{2.data.title}}` |
| Thumbnail | `{{2.data.thumbnail}}` |
| Intro | `{{2.data.intro}}` |
| Main Content | `{{2.data.mainContent}}` |
| Conclusion | `{{2.data.conclusion}}` |
| Description | `{{2.data.description}}` |
| Tags | `{{join(2.data.tags; ", ")}}` |
| Generated At | `{{2.data.generatedAt}}` |

## 방법 2: 서버에서 직접 저장

### HTTP Request Body:
```json
{
  "topic": "{{topic}}",
  "materials": ["{{material1}}", "{{material2}}"],
  "keywords": ["{{keyword1}}", "{{keyword2}}"],
  "saveToAirtable": true  // 서버에서 자동 저장
}
```

### 필요한 환경변수 (Render):
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`

## 방법 3: 분리된 API 호출

### 시나리오 구성:
1. **HTTP Request 1** → 시나리오 생성
2. **HTTP Request 2** → Airtable 저장

#### HTTP Request 2:
```json
{
  "url": "https://youtube-senario-automation.onrender.com/api/save-to-airtable",
  "method": "POST",
  "body": "{{1.data.data}}"  // 생성된 시나리오 전체
}
```

## 파싱 문제 해결

### 긴 텍스트 처리:
시나리오 내용이 잘리는 경우:
```javascript
// substring 사용
{{substring(2.data.mainContent; 0; 2000)}}

// 또는 여러 필드로 나누기
Main Content 1: {{substring(2.data.mainContent; 0; 2000)}}
Main Content 2: {{substring(2.data.mainContent; 2000; 4000)}}
```

### 태그 배열 처리:
```javascript
// 쉼표로 구분된 문자열로
{{join(2.data.tags; ", ")}}

// 또는 개별 필드로
Tag1: {{2.data.tags[1]}}
Tag2: {{2.data.tags[2]}}
```

## Airtable 필드 타입 권장사항

| 필드 | Airtable 타입 | 이유 |
|-----|--------------|------|
| Topic | Single line text | 짧은 텍스트 |
| Title | Single line text | 제목 |
| Thumbnail | Long text | 긴 설명 |
| Intro | Long text | 스크립트 |
| Main Content | Long text | 메인 콘텐츠 |
| Conclusion | Long text | 결론 |
| Description | Long text | 설명 |
| Tags | Single line text | 쉼표 구분 |
| Generated At | Date & Time | 타임스탬프 |
| Status | Single Select | Draft/Published |

## 에러 처리

Make.com에서 Error Handler 추가:
1. HTTP Request 모듈 우클릭
2. Add error handler
3. **Break** 또는 **Resume** 선택
4. 에러 시 알림 설정 (Email, Slack 등)