import { invoke } from '@tauri-apps/api/core';

import type {
  AnswerRecord,
  AppSettings,
  PackStatistics,
  Question,
  QuizPack,
  QuizPackSummary,
  WeakQuestion,
} from './types';

export const importQuizPack = (filePath: string) =>
  invoke<QuizPack>('import_quiz_pack', { filePath });

export const listQuizPacks = () => invoke<QuizPackSummary[]>('list_quiz_packs');

export const getQuizPack = (packId: string) =>
  invoke<QuizPack>('get_quiz_pack', { packId });

export const deleteQuizPack = (packId: string) =>
  invoke<void>('delete_quiz_pack', { packId });

export const getQuestionsByPack = (packId: string) =>
  invoke<Question[]>('get_questions_by_pack', { packId });

export const saveAnswerRecord = (record: AnswerRecord) =>
  invoke<void>('save_answer_record', { record });

export const getLearningHistory = (packId: string) =>
  invoke<AnswerRecord[]>('get_learning_history', { packId });

export const getPackStatistics = (packId: string) =>
  invoke<PackStatistics>('get_pack_statistics', { packId });

export const getWeakQuestions = (packId: string) =>
  invoke<WeakQuestion[]>('get_weak_questions', { packId });

export const getSettings = () => invoke<AppSettings>('get_settings');

export const updateSetting = (key: string, value: string) =>
  invoke<void>('update_setting', { key, value });

export const openFileDialog = () => invoke<string | null>('open_file_dialog');
