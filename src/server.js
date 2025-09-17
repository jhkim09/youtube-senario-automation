import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Airtable from 'airtable';
import { config } from './config/index.js';
import scenarioService from './services/scenario.js';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Airtable 저장 함수 정의 (Direct API 사용)
const saveToAirtable = async (scenario) => {
  if (!process.env.AIRTABLE_API_KEY) {
    throw new Error('Airtable API 키가 설정되지 않았습니다.');
  }

  const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Table 1');
  const baseId = 'app0nk3oQJxZCqmDn';  // 하드코딩된 Base ID
  const apiKey = process.env.AIRTABLE_API_KEY;

  const fullContent = `
주제: ${scenario.topic}
제목: ${scenario.title || ''}

=== 썸네일 아이디어 ===
${scenario.thumbnail || ''}

=== 인트로 ===
${scenario.intro || ''}

=== 본문 ===
${scenario.mainContent || ''}

=== 결론 ===
${scenario.conclusion || ''}

=== 영상 설명 ===
${scenario.description || ''}

=== 태그 ===
${scenario.tags ? scenario.tags.join(', ') : ''}

생성 시간: ${scenario.generatedAt || new Date().toISOString()}
  `.trim();

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'Topic': scenario.topic,
        'Title': scenario.title || '',
        'Intro': scenario.intro || '',
        'Main Content': scenario.mainContent || '',
        'Conclusion': scenario.conclusion || '',
        'Description': scenario.description || '',
        'Tags': scenario.tags ? scenario.tags.join(', ') : '',
        'Generated At': scenario.generatedAt || new Date().toISOString()
      }
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Airtable save failed');
  }

  return result;
};

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'YouTube Scenario Generator API',
    endpoints: {
      'POST /api/generate-scenario': '시나리오 생성',
      'POST /webhook/make': 'Make.com 웹훅',
      'POST /api/save-to-airtable': 'Airtable 저장',
      'GET /api/scenarios': '시나리오 목록 조회',
      'GET /api/debug/env': '환경 변수 확인 (디버그)',
      'POST /api/debug/airtable-write-test': 'Airtable 쓰기 테스트 (OpenAI 없이)'
    }
  });
});

// 환경 변수 확인 (디버그용)
app.get('/api/debug/env', (req, res) => {
  res.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
    hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
    airtableTable: process.env.AIRTABLE_TABLE_NAME || 'Not set',
    airtableBaseId: process.env.AIRTABLE_BASE_ID ? `${process.env.AIRTABLE_BASE_ID.substring(0, 6)}...` : 'Not set',
    airtableKeyPrefix: process.env.AIRTABLE_API_KEY ? process.env.AIRTABLE_API_KEY.substring(0, 7) : 'Not set'
  });
});

// Airtable 쓰기 테스트 (OpenAI 없이)
app.post('/api/debug/airtable-write-test', async (req, res) => {
  try {
    const testScenario = {
      topic: req.body.topic || '디버그 테스트 주제',
      title: req.body.title || '디버그 테스트 제목',
      thumbnail: '썸네일 테스트 내용',
      intro: '인트로 테스트 내용',
      mainContent: '본문 테스트 내용',
      conclusion: '결론 테스트 내용',
      description: '설명 테스트 내용',
      tags: ['테스트', '디버그', 'airtable'],
      generatedAt: new Date().toISOString()
    };

    logger.info('Airtable 쓰기 테스트 시작');

    const result = await saveToAirtable(testScenario);

    res.json({
      success: true,
      message: 'Airtable 쓰기 테스트 성공',
      airtableId: result.id,
      fields: result.fields
    });
  } catch (error) {
    logger.error('Airtable 쓰기 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Airtable 직접 쓰기 테스트 (최소화)
app.post('/api/debug/airtable-minimal-test', async (req, res) => {
  try {
    const tableName = encodeURIComponent('Table 1');
    const baseId = 'app0nk3oQJxZCqmDn';
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!apiKey) {
      throw new Error('No API key');
    }

    const testData = {
      fields: {
        'Topic': `Test Topic ${new Date().toISOString()}`,
        'Title': 'Test Title',
        'Main Content': 'Test content'
      }
    };

    logger.info('Minimal Airtable test:', { baseId, tableName });

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    logger.info('Airtable response:', { status: response.status, result });

    if (response.ok) {
      res.json({
        success: true,
        id: result.id,
        fields: result.fields
      });
    } else {
      res.status(response.status).json({
        success: false,
        status: response.status,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Minimal test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Airtable 연결 테스트 (디버그용)
app.get('/api/debug/airtable-test', async (req, res) => {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return res.json({ error: 'Airtable credentials not configured' });
  }

  // Try different table names
  const tableToTry = req.query.table || process.env.AIRTABLE_TABLE_NAME || 'table1';
  const tableNames = [tableToTry, 'Table1', 'table1', 'youtube', 'Youtube', 'Table 1'];
  let results = [];

  for (const tableName of [...new Set(tableNames)]) {
    try {
      const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
        }
      });

      const data = await response.json();

      results.push({
        tableName: tableName,
        status: response.status,
        success: response.ok,
        error: data.error?.message,
        recordCount: data.records ? data.records.length : 0,
        fields: data.records && data.records[0] ? Object.keys(data.records[0].fields) : []
      });

      // If successful, stop trying
      if (response.ok) break;
    } catch (error) {
      results.push({
        tableName: tableName,
        error: error.message
      });
    }
  }

  res.json({
    baseId: process.env.AIRTABLE_BASE_ID,
    results: results
  });
});

// 시나리오 생성 API
app.post('/api/generate-scenario', async (req, res) => {
  try {
    const {
      topic,
      tone = 'informative',
      length = 'medium',
      targetAudience = 'general',
      videoType = 'educational',
      materials = [],
      keywords = [],
      references = []
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: '주제(topic)는 필수입니다.' });
    }

    logger.info(`시나리오 생성 요청: ${topic}`);

    const scenario = await scenarioService.generateScenario(topic, {
      tone,
      length,
      targetAudience,
      videoType,
      materials,
      keywords,
      references
    });

    // 생성 시간 추가
    scenario.generatedAt = new Date().toISOString();
    scenario.topic = topic;
    scenario.options = { tone, length, targetAudience, videoType };

    res.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    logger.error('시나리오 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Make.com 웹훅 엔드포인트
app.post('/webhook/make', async (req, res) => {
  try {
    logger.info('Make.com 웹훅 수신', {
      headers: req.headers,
      body: req.body
    });

    // Make.com에서 보낸 데이터 처리
    const {
      topic,
      materials = [],
      keywords = [],
      references = [],
      tone = null,
      length = null,
      targetAudience = 'general',
      videoType = 'educational',
      shouldSaveToAirtable = false
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: '주제(topic)는 필수입니다.' });
    }

    // 배열 또는 문자열 처리
    const materialsArray = Array.isArray(materials) ? materials :
                          (typeof materials === 'string' && materials ? materials.split(',').map(m => m.trim()) : []);
    const keywordsArray = Array.isArray(keywords) ? keywords :
                         (typeof keywords === 'string' && keywords ? keywords.split(',').map(k => k.trim()) : []);
    const referencesArray = Array.isArray(references) ? references :
                           (typeof references === 'string' && references ? references.split(',').map(r => r.trim()) : []);

    logger.info(`3개 시나리오 생성 시작: ${topic}`);

    const scenarios = await scenarioService.generateThreeScenarios(topic, {
      tone: tone || 'informative',
      length: length || 'short',  // 기본값 5분
      targetAudience: targetAudience || 'general',
      videoType: videoType || 'educational',
      materials: materialsArray,
      keywords: keywordsArray,
      references: referencesArray
    });

    // 각 시나리오에 메타데이터 추가
    scenarios.forEach(scenario => {
      scenario.generatedAt = new Date().toISOString();
      scenario.topic = topic;
      scenario.options = { tone, length, targetAudience, videoType };
    });

    // Airtable에 저장 옵션이 있으면 모든 시나리오 저장
    if (shouldSaveToAirtable === true && scenarios.length > 0) {
      logger.info('Airtable 저장 시도...', {
        hasApiKey: !!process.env.AIRTABLE_API_KEY,
        hasBaseId: !!process.env.AIRTABLE_BASE_ID,
        tableName: process.env.AIRTABLE_TABLE_NAME || 'youtube'
      });

      if (process.env.AIRTABLE_API_KEY) {
        const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Table 1');
        // 테스트에서 성공한 Base ID 사용
        const baseId = 'app0nk3oQJxZCqmDn';  // process.env.AIRTABLE_BASE_ID
        const apiKey = process.env.AIRTABLE_API_KEY;

        logger.info('Airtable 저장 상세 정보:', {
          baseId: baseId,
          tableName: tableName,
          apiKeyPrefix: apiKey.substring(0, 7),
          envBaseId: process.env.AIRTABLE_BASE_ID
        });

        const airtableResults = [];

        for (const scenario of scenarios) {
          try {
            // 각 시나리오를 개별적으로 저장
            const fullContent = `
=== 버전 ${scenario.version} ===
주제: ${scenario.topic}
제목: ${scenario.title || ''}

=== 썸네일 아이디어 ===
${scenario.thumbnail || ''}

=== 인트로 ===
${scenario.intro || ''}

=== 본문 ===
${scenario.mainContent || ''}

=== 결론 ===
${scenario.conclusion || ''}

=== 영상 설명 ===
${scenario.description || ''}

=== 태그 ===
${scenario.tags ? scenario.tags.join(', ') : ''}

생성 시간: ${scenario.generatedAt}
톤: ${scenario.options?.tone || ''}
길이: ${scenario.options?.length || 'short'}
대상: ${scenario.options?.targetAudience || ''}
유형: ${scenario.options?.videoType || ''}
            `.trim();

            // Direct API call instead of using Airtable library
            const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  'Attachment Summary': fullContent
                }
              })
            });

            const result = await response.json();

            if (response.ok) {
              scenario.airtableId = result.id;
              airtableResults.push(result.id);
              logger.info(`Airtable 저장 완료 - 버전 ${scenario.version}: ${result.id}`);
            } else {
              throw new Error(result.error?.message || 'Unknown error');
            }
          } catch (airtableError) {
            logger.error(`Airtable 저장 실패 - 버전 ${scenario.version}:`, airtableError);
            scenario.airtableError = airtableError.message || airtableError.toString();
          }
        }

        if (airtableResults.length > 0) {
          logger.info(`Airtable에 ${airtableResults.length}개 시나리오 저장 완료`);
        }
      } else {
        logger.warn('Airtable 환경 변수가 설정되지 않음');
        scenarios.forEach(s => s.airtableError = 'Airtable 환경 변수 미설정');
      }
    }

    res.json({
      success: true,
      count: scenarios.length,
      data: scenarios
    });
  } catch (error) {
    logger.error('웹훅 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Airtable에 직접 저장 API
app.post('/api/save-to-airtable', async (req, res) => {
  try {
    const scenario = req.body;

    if (!scenario.topic || !scenario.title) {
      return res.status(400).json({ error: '시나리오 데이터가 불완전합니다.' });
    }

    const result = await saveToAirtable(scenario);

    res.json({
      success: true,
      airtableId: result.id,
      fields: result.fields
    });
  } catch (error) {
    logger.error('Airtable 저장 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Airtable에서 시나리오 목록 조회
app.get('/api/scenarios', async (req, res) => {
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return res.status(400).json({ error: 'Airtable 설정이 없습니다.' });
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Table 1';
    const records = [];

    await base(tableName).select({
      maxRecords: 100,
      view: 'Grid view',
      sort: [{ field: 'Generated At', direction: 'desc' }]
    }).eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords.map(record => ({
        id: record.id,
        ...record.fields
      })));
      fetchNextPage();
    });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    logger.error('시나리오 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  logger.info(`서버 시작: 포트 ${PORT}`);
  logger.info('환경 변수 상태:', {
    NODE_ENV: process.env.NODE_ENV || 'development',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
    hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
    airtableTable: process.env.AIRTABLE_TABLE_NAME || 'youtube'
  });
});