export interface SanityImageAsset {
  url: string;
}

export interface SanityImage {
  asset: SanityImageAsset;
}

export interface User {
  _id: string;
  userName: string;
  image: string;
}

export interface PostedBy {
  _id: string;
  userName: string;
  image: string;
}

export interface Like {
  _id?: string;
  _key: string;
  postedBy: PostedBy;
}

export interface Comment {
  _key: string;
  commentText: string;
  postedBy: PostedBy;
}

export interface Doro {
  _id: string;
  image?: SanityImage;
  launchAt: string;
  task: string;
  notes?: string;
  completed: boolean;
  postedBy: PostedBy;
  likes?: Like[];
  comments?: Comment[];
  userId?: string;
}

export interface TimerState {
  seconds: number;
  minutes: number;
  isRunning: boolean;
  startTime?: number;
}

// Google OAuth types
export interface GoogleCredentialResponse {
  credential: string;
  clientId?: string;
  select_by?: string;
}

export interface DecodedJWT {
  sub: string;
  name: string;
  picture: string;
  email: string;
  iat?: number;
  exp?: number;
}
