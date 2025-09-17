#!/usr/bin/env node

import { Command } from 'commander';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { config } from './config/index.js';
import youtubeService from './services/youtube.js';
import scenarioService from './services/scenario.js';
import logger from './utils/logger.js';

const program = new Command();

program
  .name('youtube-automation')
  .description('YouTube 시나리오 자동 생성 및 업로드 도구')
  .version('1.0.0');

program
  .command('generate')
  .description('YouTube 시나리오 생성')
  .option('-t, --topic <topic>', '비디오 주제')
  .option('-m, --materials <materials>', '활용할 소재 (쉼표로 구분)')
  .option('-k, --keywords <keywords>', '핵심 키워드 (쉼표로 구분)')
  .option('-r, --references <references>', '참고 자료 URL 또는 출처 (쉼표로 구분)')
  .option('--material-file <file>', '소재 파일 경로 (JSON)')
  .option('--tone <tone>', '톤 (informative, entertaining, educational)', 'informative')
  .option('--length <length>', '길이 (short, medium, long)', 'medium')
  .option('--audience <audience>', '대상 청중', 'general')
  .option('--type <type>', '비디오 유형', 'educational')
  .option('-o, --output <path>', '출력 파일 경로')
  .action(async (options) => {
    try {
      if (!options.topic) {
        console.error('❌ 주제를 지정해주세요 (-t 또는 --topic)');
        process.exit(1);
      }

      console.log('📝 시나리오 생성 중...');

      // 소재 처리
      let materials = [];
      let keywords = [];
      let references = [];

      if (options.materialFile) {
        // 파일에서 소재 로드
        const materialData = await fs.readFile(options.materialFile, 'utf8');
        const materialConfig = JSON.parse(materialData);
        materials = materialConfig.materials || [];
        keywords = materialConfig.keywords || [];
        references = materialConfig.references || [];
      } else {
        // 명령줄 옵션에서 처리
        if (options.materials) {
          materials = options.materials.split(',').map(m => m.trim());
        }
        if (options.keywords) {
          keywords = options.keywords.split(',').map(k => k.trim());
        }
        if (options.references) {
          references = options.references.split(',').map(r => r.trim());
        }
      }

      const scenario = await scenarioService.generateScenario(options.topic, {
        tone: options.tone,
        length: options.length,
        targetAudience: options.audience,
        videoType: options.type,
        materials,
        keywords,
        references
      });

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(scenario, null, 2));
        console.log(`✅ 시나리오가 ${options.output}에 저장되었습니다.`);
      } else {
        console.log('\n=== 생성된 시나리오 ===\n');
        console.log(`📌 제목: ${scenario.title}\n`);
        console.log(`🖼️  썸네일: ${scenario.thumbnail}\n`);
        console.log(`🎬 인트로:\n${scenario.intro}\n`);
        console.log(`📖 본문:\n${scenario.mainContent}\n`);
        console.log(`🎯 결론:\n${scenario.conclusion}\n`);
        console.log(`📝 설명:\n${scenario.description}\n`);
        console.log(`🏷️  태그: ${scenario.tags.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ 시나리오 생성 실패:', error.message);
      process.exit(1);
    }
  });

program
  .command('upload')
  .description('비디오 업로드')
  .requiredOption('-f, --file <path>', '비디오 파일 경로')
  .requiredOption('-t, --title <title>', '비디오 제목')
  .requiredOption('-d, --description <description>', '비디오 설명')
  .option('--tags <tags>', '태그 (쉼표로 구분)', '')
  .option('--privacy <privacy>', '공개 설정 (private, unlisted, public)', 'private')
  .action(async (options) => {
    try {
      console.log('🚀 YouTube 서비스 초기화 중...');
      await youtubeService.initialize();

      const tags = options.tags ? options.tags.split(',').map(tag => tag.trim()) : [];

      console.log('📤 비디오 업로드 중...');
      const result = await youtubeService.uploadVideo(
        options.file,
        options.title,
        options.description,
        tags
      );

      console.log(`✅ 비디오 업로드 성공!`);
      console.log(`🔗 비디오 ID: ${result.id}`);
      console.log(`🔗 URL: https://youtube.com/watch?v=${result.id}`);

      if (options.privacy !== 'private') {
        console.log(`🔄 공개 설정 변경 중...`);
        await youtubeService.updateVideoStatus(result.id, options.privacy);
        console.log(`✅ 공개 설정 변경 완료: ${options.privacy}`);
      }
    } catch (error) {
      console.error('❌ 업로드 실패:', error.message);
      process.exit(1);
    }
  });

program
  .command('auth')
  .description('YouTube OAuth 인증')
  .action(async () => {
    try {
      console.log('🔐 YouTube 인증 진행 중...');
      await youtubeService.initialize();
      console.log('✅ 인증 완료!');

      const channelInfo = await youtubeService.getChannelInfo();
      console.log(`\n📺 채널 정보:`);
      console.log(`- 이름: ${channelInfo.snippet.title}`);
      console.log(`- 구독자: ${channelInfo.statistics.subscriberCount}`);
      console.log(`- 비디오 수: ${channelInfo.statistics.videoCount}`);
    } catch (error) {
      console.error('❌ 인증 실패:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('내 비디오 목록 조회')
  .option('-n, --number <count>', '조회할 비디오 수', '10')
  .action(async (options) => {
    try {
      console.log('🔍 비디오 목록 조회 중...');
      await youtubeService.initialize();

      const videos = await youtubeService.listVideos(parseInt(options.number));

      if (videos.length === 0) {
        console.log('📹 업로드된 비디오가 없습니다.');
      } else {
        console.log(`\n📹 최근 비디오 ${videos.length}개:\n`);
        videos.forEach((video, index) => {
          console.log(`${index + 1}. ${video.snippet.title}`);
          console.log(`   조회수: ${video.statistics.viewCount || 0}`);
          console.log(`   좋아요: ${video.statistics.likeCount || 0}`);
          console.log(`   URL: https://youtube.com/watch?v=${video.id}`);
          console.log();
        });
      }
    } catch (error) {
      console.error('❌ 조회 실패:', error.message);
      process.exit(1);
    }
  });

program
  .command('schedule')
  .description('자동 업로드 스케줄 시작')
  .option('--topics <file>', '주제 목록 파일 경로', './topics.json')
  .action(async (options) => {
    try {
      console.log('⏰ 스케줄러 시작...');
      console.log(`📅 스케줄: ${config.schedule.cronPattern}`);

      // 주제 목록 로드
      const topicsData = await fs.readFile(options.topics, 'utf8');
      const topics = JSON.parse(topicsData);
      let topicIndex = 0;

      // YouTube 서비스 초기화
      await youtubeService.initialize();

      // 크론 작업 설정
      const task = cron.schedule(config.schedule.cronPattern, async () => {
        try {
          const topic = topics[topicIndex % topics.length];
          logger.info(`스케줄 실행: ${topic}`);

          // 시나리오 생성
          const scenario = await scenarioService.generateScenario(topic);

          // 시나리오를 파일로 저장
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const scenarioPath = `./scenarios/scenario-${timestamp}.json`;
          await fs.mkdir('./scenarios', { recursive: true });
          await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2));

          logger.info(`시나리오 저장 완료: ${scenarioPath}`);
          topicIndex++;
        } catch (error) {
          logger.error('스케줄 실행 중 오류:', error);
        }
      });

      console.log('✅ 스케줄러가 시작되었습니다. Ctrl+C로 종료하세요.');

      // 프로세스 종료 시 정리
      process.on('SIGINT', () => {
        console.log('\n👋 스케줄러를 종료합니다...');
        task.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ 스케줄러 시작 실패:', error.message);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('여러 주제에 대한 시나리오 일괄 생성')
  .requiredOption('-f, --file <path>', '주제 목록 파일 (JSON 배열)')
  .option('-o, --output <dir>', '출력 디렉토리', './scenarios')
  .action(async (options) => {
    try {
      const topicsData = await fs.readFile(options.file, 'utf8');
      const topics = JSON.parse(topicsData);

      if (!Array.isArray(topics)) {
        throw new Error('주제 파일은 JSON 배열 형식이어야 합니다.');
      }

      console.log(`📝 ${topics.length}개 주제에 대한 시나리오 생성 시작...`);

      await fs.mkdir(options.output, { recursive: true });

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        console.log(`\n[${i + 1}/${topics.length}] ${topic} 처리 중...`);

        try {
          const scenario = await scenarioService.generateScenario(topic);
          const filename = `scenario-${topic.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`;
          const filepath = path.join(options.output, filename);

          await fs.writeFile(filepath, JSON.stringify(scenario, null, 2));
          console.log(`✅ 저장 완료: ${filepath}`);
        } catch (error) {
          console.error(`❌ 실패: ${error.message}`);
        }

        // API 속도 제한 방지
        if (i < topics.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log('\n✅ 모든 시나리오 생성 완료!');
    } catch (error) {
      console.error('❌ 일괄 처리 실패:', error.message);
      process.exit(1);
    }
  });

// 로그 디렉토리 생성
await fs.mkdir('./logs', { recursive: true }).catch(() => {});

program.parse(process.argv);