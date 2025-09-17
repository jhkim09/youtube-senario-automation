import OpenAI from 'openai';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class ScenarioService {
  constructor() {
    if (config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    } else {
      console.warn('⚠️ OpenAI API 키가 설정되지 않았습니다. 시나리오 생성 기능을 사용할 수 없습니다.');
      this.openai = null;
    }
  }

  async generateScenario(topic, options = {}, variation = 0) {
    if (!this.openai) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const {
      tone = 'informative',
      length = 'short',  // 기본값을 short (5분)로 변경
      targetAudience = 'general',
      videoType = 'educational',
      materials = [],
      keywords = [],
      references = []
    } = options;

    try {
      // 각 버전에 대한 다른 접근 방식
      const approaches = [
        "초보자 친화적이고 쉬운 설명 위주로",
        "실제 사례와 예시를 중심으로",
        "전문적이고 심층적인 내용으로"
      ];

      const promptVariation = variation > 0 ? `\n\n접근 방식: ${approaches[variation % 3]}` : '';
      const prompt = this.buildPrompt(topic, tone, length, targetAudience, videoType, materials, keywords, references) + promptVariation;

      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content: "당신은 유튜브용 한국어 스크립트를 쓰는 시니어 작가이자 연출가입니다. 정확한 5분 분량의 완전한 스크립트를 작성하며, 모든 섹션을 실제 내용으로 꽉 채웁니다. 생략 부호나 대체 문구를 절대 사용하지 않습니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7 + (variation * 0.1),  // 각 버전마다 다른 창의성
        max_tokens: 4000,  // 더 긴 스크립트를 위해 증가
      });

      const scenario = completion.choices[0].message.content;
      logger.info(`시나리오 생성 완료: ${topic} (버전 ${variation + 1})`);

      return this.parseScenario(scenario);
    } catch (error) {
      logger.error('시나리오 생성 실패:', error);
      throw error;
    }
  }

  async generateThreeScenarios(topic, options = {}) {
    const scenarios = [];

    for (let i = 0; i < 3; i++) {
      try {
        const scenario = await this.generateScenario(topic, options, i);
        scenario.version = i + 1;
        scenario.versionTitle = `${topic} - 버전 ${i + 1}`;
        scenarios.push(scenario);

        // API 속도 제한 방지를 위한 지연
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error(`시나리오 생성 실패 - 버전 ${i + 1}:`, error);
      }
    }

    return scenarios;
  }

  buildPrompt(topic, tone, length, targetAudience, videoType, materials = [], keywords = [], references = []) {
    // 5분 고정 스크립트용 마스터 프롬프트
    const promptText = `[역할]
너는 유튜브용 한국어 스크립트를 쓰는 시니어 작가이자 연출가다. 정보 정확성, 구어체 가독성, 리듬감(문장 길이 변화)을 중시한다.

[목표]
아래 주제로 5분(300±30초) 분량, 말하기 기준 800~1,000자(공백 제외 기준 약 1,100~1,400자) 스크립트를 완성하라. 섹션마다 "실제 내용"을 모두 채우고, 빈칸/대체문구/생략부호(...)를 쓰지 마라.

[주제/타깃/톤]
- 주제: ${topic}
- 핵심청중: ${targetAudience || '일반 시청자'}
- 톤/페르소나: ${tone === 'informative' ? '친근하지만 전문가다운 신뢰감' : tone === 'casual' ? '편안하고 재미있는 친구' : '교육적이고 차분한'}, 1인 나레이션
- 비디오 유형: ${videoType}
${keywords.length > 0 ? `- 핵심 키워드: ${keywords.join(', ')}` : ''}
${materials.length > 0 ? `- 활용할 소재: ${materials.join(', ')}` : ''}
${references.length > 0 ? `- 참고 자료: ${references.join(', ')}` : ''}

[구조]
00) 오프닝 훅(15~30초) — 시청 지속률을 위해 놀라움/공감/이득 중 하나로 시작
01) 섹션 1: 현황과 배경
    반드시 포함: 최근 동향, 왜 지금 중요한지, 기본 개념 설명
02) 섹션 2: 핵심 내용 전달
    반드시 포함: 주요 포인트 3~4개, 구체적 사례, 실제 적용 방법
03) 섹션 3: 심화 분석
    반드시 포함: 장단점, 비교 분석, 주의사항, 전문가 팁
04) 섹션 4: 실전 활용
    반드시 포함: 단계별 가이드, 체크리스트, 자주 하는 실수와 해결법
05) 마무리 & CTA — 요약 2문장 + 구독/좋아요/댓글 유도

[연출 지시어]
- 화면자막: [TEXT: …]
- B-roll/컷신: [B-ROLL: …]
- 효과음/음악: [SFX: …]
- 챕터타임스탬프 포함: 0:00, 0:15… 형식
- 통계/사실은 구체 수치로. 불확실하면 [FACT-CHECK: …]로 표시

[산출물 형식]
=== 제목 (Title) ===
60자 이내의 클릭 유도형 제목

=== 썸네일 (Thumbnail) ===
썸네일 텍스트 + 비주얼 아이디어

=== 인트로 (Intro) - 0:00~0:30 ===
실제 말할 내용 전체 (생략 없이)

=== 본문 (Main Content) - 0:30~4:00 ===
#### 섹션 1: [제목] (0:30~1:30)
실제 내용 전체

#### 섹션 2: [제목] (1:30~2:30)
실제 내용 전체

#### 섹션 3: [제목] (2:30~3:30)
실제 내용 전체

#### 섹션 4: [제목] (3:30~4:00)
실제 내용 전체

=== 결론 (Conclusion) - 4:00~4:30 ===
실제 말할 내용 전체

=== 영상 설명 (Description) ===
300자 이내, 핵심 키워드 포함

=== 태그 (Tags) ===
관련 태그 10개 (쉼표 구분)

=== 쇼츠 훅 (Shorts Hooks) ===
1. [10초 훅 1]
2. [10초 훅 2]
3. [10초 훅 3]

[제약/금지]
- "여기서는 ~를 다루겠다" 같은 메타 문장 금지
- "자세한 건 다음에" 금지, 모든 섹션은 내용 충실히 채움
- 과장된 주장 금지, 출처 불명 수치 금지
- 각 섹션 45~60초 분량 엄수
- 생략 부호(...), 대체 문구, 빈칸 절대 금지

[출력 언어]
한국어`;

    return promptText;
  }

  parseScenario(scenario) {
    const sections = {
      title: '',
      thumbnail: '',
      intro: '',
      mainContent: '',
      conclusion: '',
      description: '',
      tags: [],
      chapters: [],
      shortsHooks: []
    };

    try {
      // 새로운 형식에 맞게 파싱
      const parts = scenario.split(/===\s*/);

      for (const part of parts) {
        if (!part.trim()) continue;

        const lines = part.split('\n');
        const header = lines[0].toLowerCase();
        const content = lines.slice(1).join('\n').trim();

        if (header.includes('제목') || header.includes('title')) {
          sections.title = content;
        } else if (header.includes('썸네일') || header.includes('thumbnail')) {
          sections.thumbnail = content;
        } else if (header.includes('인트로') || header.includes('intro')) {
          // 타임스탬프 제거하고 내용만 추출
          sections.intro = content.replace(/\d+:\d+~?\d*:\d*/g, '').trim();
        } else if (header.includes('본문') || header.includes('main content')) {
          sections.mainContent = content;
          // 챕터 타임스탬프 추출
          const chapterMatches = content.match(/\d+:\d+/g);
          if (chapterMatches) {
            sections.chapters = chapterMatches;
          }
        } else if (header.includes('결론') || header.includes('conclusion')) {
          sections.conclusion = content.replace(/\d+:\d+~?\d*:\d*/g, '').trim();
        } else if (header.includes('영상 설명') || header.includes('description')) {
          sections.description = content;
        } else if (header.includes('태그') || header.includes('tags')) {
          sections.tags = content.split(/[,，\n]+/).map(tag => tag.trim()).filter(tag => tag);
        } else if (header.includes('쇼츠 훅') || header.includes('shorts hook')) {
          // 번호 매긴 리스트 파싱
          const hooks = content.match(/\d+\.\s*(.+)/g);
          if (hooks) {
            sections.shortsHooks = hooks.map(h => h.replace(/^\d+\.\s*/, '').trim());
          }
        }
      }

      // 태그가 10개 이상이면 10개로 제한
      if (sections.tags.length > 10) {
        sections.tags = sections.tags.slice(0, 10);
      }

      // 섹션이 비어있으면 전체 시나리오 사용
      if (!sections.title && !sections.mainContent) {
        sections.title = scenario.split('\n')[0].substring(0, 60);
        sections.mainContent = scenario;
      }

      return sections;
    } catch (error) {
      logger.error('시나리오 파싱 실패:', error);
      return { ...sections, fullScenario: scenario };
    }
  }

  async generateMultipleScenarios(topics, options = {}) {
    const scenarios = [];

    for (const topic of topics) {
      try {
        const scenario = await this.generateScenario(topic, options);
        scenarios.push({ topic, scenario });

        // API 속도 제한 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`시나리오 생성 실패 - ${topic}:`, error);
        scenarios.push({ topic, error: error.message });
      }
    }

    return scenarios;
  }

  async improveScenario(scenario, feedback) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content: "당신은 YouTube 콘텐츠 개선 전문가입니다."
          },
          {
            role: "user",
            content: `
다음 시나리오를 개선해주세요.

원본 시나리오:
${JSON.stringify(scenario, null, 2)}

개선 요청사항:
${feedback}

개선된 시나리오를 동일한 구조로 제공해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return this.parseScenario(completion.choices[0].message.content);
    } catch (error) {
      logger.error('시나리오 개선 실패:', error);
      throw error;
    }
  }
}

export default new ScenarioService();