# Render.com 배포 가이드

## 1. GitHub 저장소 준비

```bash
git add .
git commit -m "Add render.yaml for deployment"
git push origin master
```

## 2. Render.com 설정

### 계정 생성
1. [Render.com](https://render.com) 회원가입
2. GitHub 계정 연동

### Web Service 생성
1. Dashboard → New → Web Service
2. GitHub 저장소 선택
3. 설정:
   - **Name**: `youtube-scenario-generator`
   - **Branch**: `master`
   - **Root Directory**: `youtube-senario-automation`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`

### 환경 변수 설정
Dashboard → Environment → Add Environment Variable

필수:
- `OPENAI_API_KEY`: OpenAI API 키

선택 (Airtable 사용시):
- `AIRTABLE_API_KEY`: Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Airtable Base ID
- `AIRTABLE_TABLE_NAME`: `Scenarios`

## 3. 배포 URL

배포 완료 후 제공되는 URL:
```
https://youtube-scenario-generator.onrender.com
```

## 4. Make.com 연동

Make.com에서 웹훅 URL 업데이트:
- 기존: `http://localhost:3000/webhook/make`
- 변경: `https://youtube-scenario-generator.onrender.com/webhook/make`

## 5. API 테스트

```bash
# 헬스 체크
curl https://youtube-scenario-generator.onrender.com/

# 시나리오 생성 테스트
curl -X POST https://youtube-scenario-generator.onrender.com/api/generate-scenario \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "테스트 주제",
    "materials": ["소재1", "소재2"],
    "keywords": ["키워드1", "키워드2"]
  }'
```

## 6. 무료 플랜 제한사항

Render 무료 플랜:
- 15분 동안 요청이 없으면 서버가 Sleep 모드로 전환
- 다음 요청시 30초 정도 재시작 시간 필요
- 매월 750시간 무료 사용

해결 방법:
- UptimeRobot 등으로 14분마다 헬스체크
- 유료 플랜 업그레이드 ($7/월)

## 7. 로그 확인

Dashboard → Logs에서 실시간 로그 확인 가능

## 8. 자동 배포

GitHub에 푸시하면 자동으로 재배포:
```bash
git add .
git commit -m "Update"
git push origin master
```

## 9. 커스텀 도메인 (선택)

1. Dashboard → Settings → Custom Domains
2. 도메인 추가: `api.yourdomain.com`
3. DNS 설정:
   - Type: CNAME
   - Name: api
   - Value: `youtube-scenario-generator.onrender.com`

## 10. 모니터링

### 상태 확인
- Render Dashboard에서 CPU, Memory, Request 모니터링
- 에러 알림 설정 가능

### 추천 모니터링 도구
- UptimeRobot: 가동시간 모니터링
- Sentry: 에러 트래킹
- LogDNA: 로그 관리