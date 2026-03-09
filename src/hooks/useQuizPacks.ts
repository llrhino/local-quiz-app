import { useEffect, useState } from 'react';

import { listQuizPacks } from '../lib/commands';
import type { QuizPackSummary } from '../lib/types';

export function useQuizPacks() {
  const [packs, setPacks] = useState<QuizPackSummary[]>([]);

  useEffect(() => {
    void listQuizPacks().then(setPacks).catch(() => setPacks([]));
  }, []);

  return packs;
}
