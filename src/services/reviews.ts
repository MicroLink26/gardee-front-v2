import { api } from './api';
import type { RatingDetails } from '../types';

export async function validateToken(token: string) {
  const { data } = await api.get('/reviews/validate', { params: { token } });
  return data;
}

export async function submitReview(data: {
  token: string;
  ratings: RatingDetails;
  recommend?: boolean;
  comment?: string;
}): Promise<void> {
  await api.post('/reviews/submit', data);
}
