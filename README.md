# YouTube 시나리오 자동화 도구

YouTube 콘텐츠 제작을 위한 시나리오 자동 생성 도구입니다. Make.com과 Airtable을 통한 완전 자동화를 지원합니다.

## 주요 기능

- 🤖 AI 기반 시나리오 자동 생성 (OpenAI GPT)
- 🔗 Make.com 웹훅 연동
- 📊 Airtable 데이터베이스 연동
- 🌐 REST API 제공
- 📤 YouTube 비디오 업로드 (선택사항)
- ⏰ 스케줄링 자동화

## 설치

```bash
npm install
```

## 설정

1. `.env.example`을 `.env`로 복사하고 API 키 설정:

```bash
cp .env.example .env
```

2. 필요한 API 키 획득:
   - [Google Cloud Console](https://console.cloud.google.com)에서 YouTube Data API v3 활성화
   - OAuth 2.0 클라이언트 ID 생성 후 `credentials.json`으로 저장
   - [OpenAI API](https://platform.openai.com/api-keys)에서 API 키 생성

## 사용법

### 🌐 웹 서버 모드 (Make.com 연동)

```bash
# 서버 실행
npm run server

# 개발 모드 (자동 재시작)
npm run dev-server
```

서버 실행 후 Make.com에서 웹훅 URL 설정:
- 시나리오 생성: `POST http://localhost:3000/webhook/make`
- API 직접 호출: `POST http://localhost:3000/api/generate-scenario`

자세한 설정은 [Make.com 설정 가이드](docs/make-com-setup.md) 참조

### 📝 CLI 모드

### YouTube 인증
```bash
npm start auth
```

### 시나리오 생성
```bash
# 기본 시나리오 생성
npm start generate -t "주제"

# 소재와 키워드 포함
npm start generate -t "AI 트렌드" -m "GPT-5 출시,Gemini Ultra,AI 규제" -k "인공지능,LLM,AGI"

# 참고자료 추가
npm start generate -t "주제" -r "OpenAI 블로그,MIT Tech Review"

# 소재 파일 사용
npm start generate -t "주제" --material-file examples/investment-materials.json

# 상세 옵션 지정
npm start generate -t "주제" --tone entertaining --length long --audience young --type tutorial

# 파일로 저장
npm start generate -t "주제" -o scenario.json
```

### 비디오 업로드
```bash
npm start upload -f video.mp4 -t "제목" -d "설명" --tags "태그1,태그2" --privacy public
```

### 비디오 목록 조회
```bash
npm start list -n 20
```

### 일괄 시나리오 생성
```bash
npm start batch -f topics.json -o ./scenarios
```

### 자동화 스케줄 실행
```bash
npm start schedule --topics topics.json
```

## 명령어 옵션

### generate
- `-t, --topic <topic>`: 비디오 주제 (필수)
- `-m, --materials <materials>`: 활용할 소재 (쉼표로 구분)
- `-k, --keywords <keywords>`: 핵심 키워드 (쉼표로 구분)
- `-r, --references <references>`: 참고 자료 (쉼표로 구분)
- `--material-file <file>`: 소재 파일 경로 (JSON 형식)
- `--tone <tone>`: 톤 (informative, entertaining, educational)
- `--length <length>`: 길이 (short, medium, long)
- `--audience <audience>`: 대상 청중
- `--type <type>`: 비디오 유형
- `-o, --output <path>`: 출력 파일 경로

### upload
- `-f, --file <path>`: 비디오 파일 경로 (필수)
- `-t, --title <title>`: 비디오 제목 (필수)
- `-d, --description <description>`: 비디오 설명 (필수)
- `--tags <tags>`: 태그 (쉼표로 구분)
- `--privacy <privacy>`: 공개 설정 (private, unlisted, public)

## 프로젝트 구조

```
youtube-scenario-automation/
├── src/
│   ├── config/          # 설정 파일
│   ├── services/        # 서비스 모듈
│   │   ├── youtube.js   # YouTube API 서비스
│   │   └── scenario.js  # 시나리오 생성 서비스
│   ├── utils/           # 유틸리티
│   │   └── logger.js    # 로깅
│   └── index.js         # 메인 CLI
├── examples/            # 소재 파일 예시
│   ├── investment-materials.json
│   └── health-materials.json
├── logs/                # 로그 파일
├── scenarios/           # 생성된 시나리오
├── .env                 # 환경 변수
├── credentials.json     # Google OAuth 인증 정보
├── token.json          # 저장된 토큰
├── topics.json         # 주제 목록
└── materials-template.json # 소재 템플릿
```

## 환경 변수

```env
# YouTube API 설정
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
YOUTUBE_CHANNEL_ID=your_channel_id

# OpenAI API 설정
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# 스케줄 설정
UPLOAD_SCHEDULE="0 9 * * *"  # 매일 오전 9시
```

## 스케줄 형식 (Cron)

```
┌────────────── 초 (선택사항)
│ ┌──────────── 분 (0-59)
│ │ ┌────────── 시 (0-23)
│ │ │ ┌──────── 일 (1-31)
│ │ │ │ ┌────── 월 (1-12)
│ │ │ │ │ ┌──── 요일 (0-7, 0과 7은 일요일)
│ │ │ │ │ │
* * * * * *
```

예시:
- `"0 9 * * *"`: 매일 오전 9시
- `"0 */6 * * *"`: 6시간마다
- `"0 9 * * 1"`: 매주 월요일 오전 9시

## 소재 파일 형식

소재 파일은 JSON 형식으로 작성하며, 다음과 같은 구조를 가집니다:

```json
{
  "topic": "주제",
  "materials": [
    "소재 1",
    "소재 2",
    "소재 3"
  ],
  "keywords": [
    "키워드1",
    "키워드2"
  ],
  "references": [
    "참고자료1",
    "참고자료2"
  ]
}
```

예시 파일은 `examples/` 폴더에서 확인할 수 있습니다.

## 주의사항

- YouTube API는 일일 할당량 제한이 있습니다
- OpenAI API 사용량에 따라 비용이 발생합니다
- 비디오 업로드는 초기에 private로 설정되며, 필요시 공개 설정을 변경할 수 있습니다
- `credentials.json`과 `token.json`은 절대 공개 저장소에 커밋하지 마세요

## 라이센스

MIT