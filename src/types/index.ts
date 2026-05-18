export type UserRole = 'client' | 'prestataire' | 'staff' | 'admin';

export interface User {
  _id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: UserRole;
  prestations: string[];
  tarifHoraire?: number;
  description?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  profil_image?: { secure_url: string; public_id: string };
  is_validated: boolean;
  averageRating: number;
  numberOfReviews: number;
  location?: { type: 'Point'; coordinates: [number, number] };
  createdAt: string;
}

export type RequestStatus =
  | 'email_pending' | 'client_confirmed' | 'sent_to_provider'
  | 'provider_proposed' | 'provider_accepted' | 'client_accepted'
  | 'scheduled' | 'completed' | 'refused' | 'cancelled';

export interface ServiceRequest {
  _id: string;
  prestataireId: string;
  requesterEmail: string;
  requesterNom?: string;
  requesterPrenom?: string;
  prestations: string[];
  estimatedHours?: number;
  recurring: boolean;
  description?: string;
  subject?: string;
  address?: string;
  codePostal?: string;
  ville?: string;
  desiredAt?: string;
  status: RequestStatus;
  proposals: Proposal[];
  ratingDetails?: RatingDetails;
  ratingComment?: string;
  recommend?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  by: 'provider' | 'client';
  date: string;
  comment?: string;
  createdAt: string;
}

export interface RatingDetails {
  time: number;
  quality: number;
  sympathy: number;
  value: number;
  punctuality: number;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  email_pending: 'En attente de confirmation',
  client_confirmed: 'Confirmée',
  sent_to_provider: 'Envoyée au prestataire',
  provider_proposed: 'Nouvelle date proposée',
  provider_accepted: 'Acceptée',
  client_accepted: 'Date acceptée',
  scheduled: 'Planifiée',
  completed: 'Terminée',
  refused: 'Refusée',
  cancelled: 'Annulée',
};
