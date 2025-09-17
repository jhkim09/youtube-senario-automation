import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class YouTubeService {
  constructor() {
    this.youtube = null;
    this.auth = null;
  }

  async initialize() {
    try {
      this.auth = await this.authorize();
      this.youtube = google.youtube({
        version: 'v3',
        auth: this.auth
      });
      logger.info('YouTube 서비스 초기화 완료');
    } catch (error) {
      logger.error('YouTube 서비스 초기화 실패:', error);
      throw error;
    }
  }

  async authorize() {
    let client = await this.loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }

    client = await authenticate({
      scopes: config.youtube.scopes,
      keyfilePath: config.paths.credentials,
    });

    if (client.credentials) {
      await this.saveCredentials(client);
    }
    return client;
  }

  async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(config.paths.token, 'utf8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  async saveCredentials(client) {
    const content = await fs.readFile(config.paths.credentials, 'utf8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(config.paths.token, payload);
  }

  async uploadVideo(videoPath, title, description, tags = [], categoryId = '22') {
    try {
      const fileSize = (await fs.stat(videoPath)).size;
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags,
            categoryId, // 22 = People & Blogs
          },
          status: {
            privacyStatus: 'private', // 초기에는 비공개로 업로드
          },
        },
        media: {
          body: fs.createReadStream(videoPath),
        },
      });

      logger.info(`비디오 업로드 성공: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('비디오 업로드 실패:', error);
      throw error;
    }
  }

  async updateVideoStatus(videoId, privacyStatus = 'public') {
    try {
      const response = await this.youtube.videos.update({
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus,
          },
        },
      });

      logger.info(`비디오 상태 업데이트 완료: ${videoId} - ${privacyStatus}`);
      return response.data;
    } catch (error) {
      logger.error('비디오 상태 업데이트 실패:', error);
      throw error;
    }
  }

  async getChannelInfo() {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });

      return response.data.items[0];
    } catch (error) {
      logger.error('채널 정보 조회 실패:', error);
      throw error;
    }
  }

  async listVideos(maxResults = 10) {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics'],
        mine: true,
        maxResults,
        order: 'date'
      });

      return response.data.items;
    } catch (error) {
      logger.error('비디오 목록 조회 실패:', error);
      throw error;
    }
  }
}

export default new YouTubeService();