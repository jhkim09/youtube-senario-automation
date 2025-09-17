# Airtable 유용한 Formula 모음

## 1. 비디오 길이 계산

```
IF(
  Length = "short", "3-5분",
  IF(
    Length = "medium", "5-10분",
    IF(
      Length = "long", "10-15분",
      "미정"
    )
  )
)
```

## 2. 태그 개수 세기

```
LEN(Tags) - LEN(SUBSTITUTE(Tags, ",", "")) + 1
```

## 3. 생성된 지 며칠 지났는지

```
DATETIME_DIFF(NOW(), {Generated At}, 'days') & "일 전"
```

## 4. 우선순위 자동 설정

```
IF(
  AND(
    {Target Audience} = "young",
    FIND("트렌드", Topic) > 0
  ),
  "🔴 높음",
  IF(
    {Video Type} = "educational",
    "🟡 중간",
    "🟢 낮음"
  )
)
```

## 5. 예상 조회수 (임의 계산)

```
IF(
  FIND("AI", Topic) > 0,
  "10K+",
  IF(
    FIND("투자", Topic) > 0,
    "5K+",
    "1K+"
  )
)
```

## 6. 업로드 추천 시간대

```
IF(
  {Target Audience} = "young",
  "저녁 7-9시",
  IF(
    {Target Audience} = "professional",
    "점심 12-1시",
    "오전 9-11시"
  )
)
```

## 7. 콘텐츠 품질 점수

```
(
  IF(LEN({Main Content}) > 500, 30, 10) +
  IF(LEN(Description) > 200, 20, 10) +
  IF(LEN(Tags) - LEN(SUBSTITUTE(Tags, ",", "")) > 5, 20, 10) +
  IF({Thumbnail} != BLANK(), 30, 0)
) & "/100"
```

## 8. 자동 상태 업데이트

```
IF(
  {Published Date} != BLANK(),
  "✅ Published",
  IF(
    DATETIME_DIFF(NOW(), {Generated At}, 'days') > 7,
    "⚠️ Old Draft",
    "📝 Draft"
  )
)
```

## 9. SEO 점수

```
(
  IF(LEN(Title) >= 10, 25, 10) +
  IF(LEN(Title) <= 60, 25, 10) +
  IF(FIND({Main Keyword}, Title) > 0, 25, 0) +
  IF(FIND({Main Keyword}, Description) > 0, 25, 0)
) & "%"
```

## 10. 다음 액션 제안

```
IF(
  Status = "Draft",
  "🎬 비디오 제작",
  IF(
    Status = "Video Ready",
    "📤 업로드",
    IF(
      Status = "Published",
      "📊 성과 분석",
      "대기"
    )
  )
)
```

## View 필터 예시

### 이번 주 생성된 시나리오
```
IS_AFTER({Generated At}, DATEADD(TODAY(), -7, 'days'))
```

### 높은 우선순위
```
OR(
  FIND("트렌드", Topic) > 0,
  {Target Audience} = "young"
)
```

### 업로드 준비 완료
```
AND(
  Status = "Draft",
  LEN({Main Content}) > 500,
  {Thumbnail} != BLANK()
)
```

## Automation 예시

### 1. 7일 이상 된 Draft 알림
- Trigger: When record matches conditions
- Condition: `AND(Status = "Draft", DATETIME_DIFF(NOW(), {Generated At}, 'days') > 7)`
- Action: Send email or Slack message

### 2. 새 시나리오 생성시 팀 알림
- Trigger: When record is created
- Action: Post to Slack with scenario details

### 3. 매주 월요일 주간 리포트
- Trigger: At scheduled time (Monday 9 AM)
- Action: Find records created last week → Send summary email