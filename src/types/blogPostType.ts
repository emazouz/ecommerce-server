export interface BlogPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  categoryId?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  publishedAt?: Date;
  imageUrl?: string;
  excerpt?: string;
  views?: number;
  commentsCount?: number;

  likesCount?: number;
  dislikesCount?: number;
  isFeatured?: boolean;
  isPinned?: boolean;
}
