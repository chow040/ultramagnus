import { apiJson } from './apiClient';

export const addBookmark = async (targetId: string, pinned = false) => {
  const { data } = await apiJson<{ ok: boolean; bookmarkId?: string }>('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId, targetType: 'report', pinned })
  }, { operation: 'bookmarks.add' });
  return data;
};

export const removeBookmark = async (bookmarkId: string) => {
  await apiJson(`/api/bookmarks/${bookmarkId}`, {
    method: 'DELETE'
  }, { operation: 'bookmarks.remove' });
};

export interface BookmarkListResponse {
  items: {
    id: string;
    targetId: string;
    targetType: string;
    userId: string;
    pinned: boolean;
    createdAt: string;
    updatedAt?: string;
    report?: {
      id: string;
      title: string;
      ticker?: string;
      status: string;
      type: string;
      ownerId: string;
      createdAt: string;
      updatedAt: string;
    };
  }[];
  page: number;
  pageSize: number;
  total: number;
  errors?: { section: string; message: string }[];
}

export const listBookmarks = async (page = 1, pageSize = 10) => {
  const { data } = await apiJson<BookmarkListResponse>(`/api/bookmarks?page=${page}&pageSize=${pageSize}`, {
    method: 'GET'
  }, { operation: 'bookmarks.list' });
  return data;
};
