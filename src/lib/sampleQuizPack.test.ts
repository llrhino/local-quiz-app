import sampleQuizPack from '../../src-tauri/resources/sample-quiz-pack.json';

describe('sample-quiz-pack.json', () => {
  it('NISTサイバーセキュリティフレームワークの設問は漢字2文字の答えを持つ', () => {
    const targetQuestion = sampleQuizPack.questions.find(
      (question) =>
        question.type === 'text_input' &&
        question.question.includes('NISTが策定したサイバーセキュリティフレームワーク'),
    );

    expect(targetQuestion).toBeDefined();
    expect(targetQuestion?.question).toContain('漢字2文字');
    expect(targetQuestion?.answer).toBe('識別');
  });
});
