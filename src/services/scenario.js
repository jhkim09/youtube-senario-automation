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

  async generateScenario(topic, options = {}) {
    if (!this.openai) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const {
      tone = 'informative',
      length = 'medium',
      targetAudience = 'general',
      videoType = 'educational',
      materials = [],
      keywords = [],
      references = []
    } = options;

    try {
      const prompt = this.buildPrompt(topic, tone, length, targetAudience, videoType, materials, keywords, references);

      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: "system",
            content: "당신은 YouTube 콘텐츠 크리에이터를 위한 전문 시나리오 작가입니다. 매력적이고 시청자 참여를 유도하는 비디오 스크립트를 작성합니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const scenario = completion.choices[0].message.content;
      logger.info(`시나리오 생성 완료: ${topic}`);

      return this.parseScenario(scenario);
    } catch (error) {
      logger.error('시나리오 생성 실패:', error);
      throw error;
    }
  }

  buildPrompt(topic, tone, length, targetAudience, videoType, materials = [], keywords = [], references = []) {
    const lengthMap = {
      'short': '3-5분',
      'medium': '5-10분',
      'long': '10-15분'
    };

    let promptText = `
주제: ${topic}
비디오 유형: ${videoType}
톤: ${tone}
길이: ${lengthMap[length]}
대상 청중: ${targetAudience}`;

    if (materials.length > 0) {
      promptText += `\n\n활용할 소재:`;
      materials.forEach((material, index) => {
        promptText += `\n${index + 1}. ${material}`;
      });
    }

    if (keywords.length > 0) {
      promptText += `\n\n핵심 키워드: ${keywords.join(', ')}`;
    }

    if (references.length > 0) {
      promptText += `\n\n참고 자료:`;
      references.forEach((ref, index) => {
        promptText += `\n${index + 1}. ${ref}`;
      });
    }

    promptText += `\n\n위 정보를 바탕으로 YouTube 비디오 시나리오를 작성해주세요.

다음 구조로 작성해주세요:
1. 제목 (Title): 매력적이고 클릭을 유도하는 제목
2. 썸네일 아이디어 (Thumbnail Idea): 시각적으로 매력적인 썸네일 설명
3. 인트로 (Intro): 15-30초의 강력한 오프닝
4. 본문 (Main Content): 주요 내용을 섹션별로 구성
5. 결론 (Conclusion): 핵심 요약과 행동 유도
6. 설명 (Description): YouTube 비디오 설명란에 들어갈 내용
7. 태그 (Tags): 관련 태그 10개

각 섹션은 명확하게 구분해주세요.`;

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
      tags: []
    };

    try {
      // 전체 시나리오를 섹션별로 분리
      const lines = scenario.split('\n');
      let currentSection = '';
      let sectionContent = {};

      for (const line of lines) {
        // 섹션 헤더 감지
        if (line.match(/^#*\s*\d*\.?\s*(Title|제목)/i)) {
          currentSection = 'title';
          sectionContent[currentSection] = [];
        } else if (line.match(/^#*\s*\d*\.?\s*(Thumbnail|썸네일)/i)) {
          currentSection = 'thumbnail';
          sectionContent[currentSection] = [];
        } else if (line.match(/^#*\s*\d*\.?\s*(Intro|인트로)/i)) {
          currentSection = 'intro';
          sectionContent[currentSection] = [];
        } else if (line.match(/^#*\s*\d*\.?\s*(Main Content|본문|주요 내용)/i)) {
          currentSection = 'mainContent';
          sectionContent[currentSection] = [];
        } else if (line.match(/^#*\s*\d*\.?\s*(Conclusion|결론)/i)) {
          currentSection = 'conclusion';
          sectionContent[currentSection] = [];
        } else if (line.match(/^#*\s*\d*\.?\s*(Description|설명)/i)) {
          currentSection = 'description';
          sectionContent[currentSection] = [];
        } else if (line.match(/^#*\s*\d*\.?\s*(Tags|태그)/i)) {
          currentSection = 'tags';
          sectionContent[currentSection] = [];
        } else if (currentSection && line.trim()) {
          // 현재 섹션에 내용 추가
          sectionContent[currentSection].push(line.trim());
        }
      }

      // 각 섹션 조합
      for (const [key, lines] of Object.entries(sectionContent)) {
        if (key === 'tags') {
          const tagsText = lines.join(' ');
          sections.tags = tagsText.split(/[,#\s]+/).filter(tag => tag && !tag.match(/^[\d\.]+$/));
        } else {
          sections[key] = lines.join('\n').replace(/^[:\-]\s*/, '').trim();
        }
      }

      // 섹션이 비어있으면 전체 시나리오 사용
      if (!sections.title && !sections.mainContent) {
        sections.title = scenario.split('\n')[0].substring(0, 100);
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