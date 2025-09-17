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

// Airtable 저장 함수 정의
const saveToAirtable = async (scenario) => {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error('Airtable 설정이 없습니다.');
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);

  const tableName = process.env.AIRTABLE_TABLE_NAME || 'table1';

  const record = await base(tableName).create({
    'Topic': scenario.topic,
    'Title': scenario.title,
    'Thumbnail': scenario.thumbnail,
    'Intro': scenario.intro,
    'Main Content': scenario.mainContent,
    'Conclusion': scenario.conclusion,
    'Description': scenario.description,
    'Tags': scenario.tags ? scenario.tags.join(', ') : '',
    'Generated At': scenario.generatedAt,
    'Tone': scenario.options?.tone,
    'Length': scenario.options?.length,
    'Target Audience': scenario.options?.targetAudience,
    'Video Type': scenario.options?.videoType
  });

  return record;
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
      'GET /api/debug/env': '환경 변수 확인 (디버그)'
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

// Airtable 연결 테스트 (디버그용)
app.get('/api/debug/airtable-test', async (req, res) => {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return res.json({ error: 'Airtable credentials not configured' });
  }

  const tableName = process.env.AIRTABLE_TABLE_NAME || 'table1';

  try {
    // Direct API call to test
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${tableName}?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
      }
    });

    const data = await response.json();

    res.json({
      status: response.status,
      statusText: response.statusText,
      tableName: tableName,
      success: response.ok,
      error: data.error,
      recordCount: data.records ? data.records.length : 0,
      fields: data.records && data.records[0] ? Object.keys(data.records[0].fields) : []
    });
  } catch (error) {
    res.json({ error: error.message });
  }
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

    const scenario = await scenarioService.generateScenario(topic, {
      tone: tone || 'informative',
      length: length || 'medium',
      targetAudience: targetAudience || 'general',
      videoType: videoType || 'educational',
      materials: materialsArray,
      keywords: keywordsArray,
      references: referencesArray
    });

    scenario.generatedAt = new Date().toISOString();
    scenario.topic = topic;

    // Airtable에 저장 옵션이 있으면 저장
    if (shouldSaveToAirtable === true) {
      logger.info('Airtable 저장 시도...', {
        hasApiKey: !!process.env.AIRTABLE_API_KEY,
        hasBaseId: !!process.env.AIRTABLE_BASE_ID,
        tableName: process.env.AIRTABLE_TABLE_NAME || 'youtube'
      });

      if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
        try {
          // 함수를 직접 여기에 인라인으로 작성
          const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
            .base(process.env.AIRTABLE_BASE_ID);
          const tableName = process.env.AIRTABLE_TABLE_NAME || 'table1';

          const airtableResult = await base(tableName).create({
            'Topic': scenario.topic,
            'Title': scenario.title || '',
            'Thumbnail': scenario.thumbnail || '',
            'Intro': scenario.intro || '',
            'Main Content': scenario.mainContent || '',
            'Conclusion': scenario.conclusion || '',
            'Description': scenario.description || '',
            'Tags': scenario.tags ? scenario.tags.join(', ') : '',
            'Generated At': scenario.generatedAt,
            'Tone': scenario.options?.tone || '',
            'Length': scenario.options?.length || '',
            'Target Audience': scenario.options?.targetAudience || '',
            'Video Type': scenario.options?.videoType || ''
          });

          scenario.airtableId = airtableResult.id;
          logger.info(`Airtable 저장 완료: ${airtableResult.id}`);
        } catch (airtableError) {
          logger.error('Airtable 저장 실패:', airtableError);
          console.error('Airtable 저장 에러 상세:', airtableError);
          scenario.airtableError = airtableError.message || airtableError.toString();
        }
      } else {
        logger.warn('Airtable 환경 변수가 설정되지 않음');
        scenario.airtableError = 'Airtable 환경 변수 미설정';
      }
    }

    res.json({
      success: true,
      data: scenario
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

    const tableName = process.env.AIRTABLE_TABLE_NAME || 'table1';
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